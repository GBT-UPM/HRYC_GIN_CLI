# Prompt: Registro clínico ginecológico — creación de recursos FHIR

## Contexto

Este prompt describe exactamente cómo replicar, desde cualquier aplicación, el proceso clínico que realiza HRYC_GIN_CLI cuando un ecografista guarda un cuestionario ginecológico. El proceso crea una cadena de recursos FHIR interrelacionados que modelan una visita ambulatoria completa.

El servidor FHIR se encuentra en `BASE_URL` (configurable). Todas las peticiones son JSON y llevan autenticación Bearer (Keycloak).

---

## Prerequisitos de datos de entrada

Antes de ejecutar el proceso necesitas tener disponibles:

| Variable | Origen | Descripción |
|---|---|---|
| `nhc` | Respuesta cuestionario (`PAT_NHC`) | Número de historia clínica |
| `given` | Respuesta cuestionario (`PAT_NOMBRE`) | Nombre del paciente |
| `patientCode` | Respuesta cuestionario (`PAT_CODIGO`) | Código interno del paciente |
| `hospitalName` | Respuesta cuestionario (`HOSPITAL_REF`) | Nombre del hospital |
| `hasMass` | Respuesta cuestionario (`PAT_MA`) | `true` si la respuesta NO es "No" |
| `practitionerId` | Sesión autenticada | ID del profesional en el servidor FHIR |
| `practitionerName` | Sesión autenticada | Nombre del profesional |
| `questionnaireResponses` | Array de objetos QuestionnaireResponse | Uno o más cuestionarios completados |
| `observations` | Array de strings | Texto libre de hallazgos ecográficos (uno por cuestionario) |
| `scores` | Array de números [0.0–1.0] | Probabilidad de malignidad calculada (uno por cuestionario) |
| `token` | Keycloak | Bearer token JWT |

---

## Proceso paso a paso

### Paso 0 — Generar IDs únicos

Todos los IDs de recursos se generan con **UUID v4** antes de hacer las peticiones. Genera en este momento:

```
patientId  = uuidv4()
encId      = uuidv4()
imgStuId   = uuidv4()
serieId    = uuidv4()
```

Y para cada cuestionario en el array `questionnaireResponses`:
```
qResponseId[i] = uuidv4()   // asignar antes de enviar
obsId[i]       = uuidv4()
riskId[i]      = uuidv4()   // solo si hasMass === true
```

---

### Paso 1 — Crear o verificar el Patient

**`POST {BASE_URL}/fhir/Patient/check-or-create`**

```json
{
  "resourceType": "Patient",
  "id": "<patientId>",
  "gender": "female",
  "birthDate": "1900-01-01",
  "identifier": [
    {
      "system": "https://mia.upm.es/patients",
      "value": "<patientCode>",
      "assigner": {
        "display": "<hospitalName>"
      }
    },
    {
      "system": "https://mia.upm.es/patients/nhc",
      "value": "<nhc>"
    }
  ],
  "name": [
    {
      "family": "",
      "given": ["<given>"]
    }
  ]
}
```

**Resultado esperado:** HTTP 200/201. El endpoint es idempotente — si el paciente ya existe lo devuelve sin duplicar.

---

### Paso 2 — Crear el Encounter

**`POST {BASE_URL}/fhir/Encounter`**

El `period` representa la consulta: `start` = ahora menos 15 minutos, `end` = ahora (en ISO 8601).

```json
{
  "resourceType": "Encounter",
  "id": "<encId>",
  "status": "finished",
  "class": {
    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    "code": "AMB",
    "display": "Ambulatory"
  },
  "type": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "83607001",
          "display": "Examen ginecológico (procedimiento)"
        }
      ],
      "text": "Examen ginecológico"
    }
  ],
  "reasonCode": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "74601000119101",
          "display": "Examen ginecológico de rutina realizado"
        }
      ],
      "text": "Examen ginecológico de rutina realizado"
    }
  ],
  "subject": {
    "reference": "Patient/<patientId>",
    "display": ""
  },
  "participant": [
    {
      "individual": {
        "reference": "Practitioner/<practitionerId>",
        "display": "<practitionerName>"
      }
    }
  ],
  "period": {
    "start": "<ISO: ahora - 15 minutos>",
    "end": "<ISO: ahora>"
  },
  "serviceProvider": {
    "reference": "Organization/hrc"
  },
  "location": [
    {
      "location": {
        "reference": "Location/gyn-unit"
      }
    }
  ]
}
```

**Resultado esperado:** HTTP 200. Continuar solo si el status es 200.

---

### Paso 3 — Crear el ImagingStudy

**`POST {BASE_URL}/fhir/ImagingStudy`**

```json
{
  "resourceType": "ImagingStudy",
  "id": "<imgStuId>",
  "status": "available",
  "modality": [
    {
      "system": "http://dicom.nema.org/resources/ontology/DCM",
      "code": "US",
      "display": "Ultrasound"
    }
  ],
  "subject": {
    "reference": "Patient/<patientId>"
  },
  "encounter": {
    "reference": "Encounter/<encId>"
  },
  "started": "<ISO: ahora>",
  "series": [
    {
      "uid": "<serieId>",
      "number": 1,
      "modality": {
        "system": "http://dicom.nema.org/resources/ontology/DCM",
        "code": "US",
        "display": "Ultrasound"
      },
      "description": "Ecografía transvaginal"
    }
  ]
}
```

---

### Paso 4 — Para cada QuestionnaireResponse (bucle)

Itera sobre el array `questionnaireResponses`. Para cada elemento en el índice `i`:

#### 4a — Crear el QuestionnaireResponse

**`POST {BASE_URL}/fhir/QuestionnaireResponse`**

```json
{
  "resourceType": "QuestionnaireResponse",
  "id": "<qResponseId[i]>",
  "status": "completed",
  "item": [ /* array de items y respuestas del cuestionario original */ ],
  "partOf": [
    {
      "reference": "Encounter/<encId>"
    }
  ],
  "subject": {
    "reference": "Patient/<patientId>"
  },
  "encounter": {
    "reference": "Encounter/<encId>"
  }
}
```

**Resultado esperado:** HTTP 200 con body JSON. El `id` devuelto en el body puede diferir del enviado según el servidor — usa el enviado (`qResponseId[i]`) para las referencias siguientes.

#### 4b — Crear la Observation de ecografía

**`POST {BASE_URL}/fhir/Observation`**

```json
{
  "resourceType": "Observation",
  "id": "<obsId[i]>",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "imaging",
          "display": "Imaging"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "45030-1",
        "display": "Findings of Ultrasound study"
      }
    ],
    "text": "Findings from transvaginal ultrasound"
  },
  "subject": {
    "reference": "Patient/<patientId>",
    "display": ""
  },
  "encounter": {
    "reference": "Encounter/<encId>"
  },
  "basedOn": [
    {
      "reference": "ImagingStudy/<imgStuId>"
    }
  ],
  "valueString": "<observations[i]>"
}
```

#### 4c — Crear el RiskAssessment (solo si `hasMass === true`)

**`POST {BASE_URL}/fhir/RiskAssessment`**

```json
{
  "resourceType": "RiskAssessment",
  "id": "<riskId[i]>",
  "status": "final",
  "subject": {
    "reference": "Patient/<patientId>"
  },
  "encounter": {
    "reference": "Encounter/<encId>"
  },
  "derivedFrom": [
    {
      "reference": "QuestionnaireResponse/<qResponseId[i]>"
    }
  ],
  "date": "<ISO: ahora>",
  "performer": {
    "reference": "Practitioner/<practitionerId>"
  },
  "prediction": [
    {
      "outcome": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "363346000",
            "display": "Malignant neoplastic disease (disorder)"
          }
        ],
        "text": "Riesgo de neoplasia maligna"
      },
      "probabilityDecimal": "<scores[i]>",
      "rationale": "Probabilidad calculada a partir de las respuestas del cuestionario."
    }
  ],
  "mitigation": ""
}
```

---

### Paso 5 (posterior) — Observation de histología

Este paso se ejecuta **más tarde**, cuando el clínico dispone del resultado anatomopatológico. No forma parte del flujo de guardado inicial.

**`POST {BASE_URL}/fhir/Observation`**

```json
{
  "resourceType": "Observation",
  "id": "<obsHistoId>",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "laboratory",
          "display": "Laboratory"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "252999005",
        "display": "Histological examination following biopsy"
      }
    ],
    "text": "Examen histopatológico"
  },
  "subject": {
    "reference": "Patient/<patientId>",
    "display": ""
  },
  "encounter": {
    "reference": "Encounter/<encId>"
  },
  "derivedFrom": [
    {
      "reference": "QuestionnaireResponse/<qResponseId>"
    }
  ],
  "effectiveDateTime": "<ISO: ahora>",
  "valueCodeableConcept": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "<código SNOMED del resultado histológico>",
        "display": "<display del resultado histológico>"
      }
    ],
    "text": "<texto del tipo de histología seleccionado>"
  },
  "note": [
    {
      "text": "<texto libre del informe anatomopatológico>"
    }
  ]
}
```

---

## Diagrama de dependencias entre recursos

```
Patient
  └─ Encounter  (subject → Patient)
       ├─ ImagingStudy  (subject → Patient, encounter → Encounter)
       └─ [por cada cuestionario]
            ├─ QuestionnaireResponse  (subject → Patient, encounter → Encounter)
            ├─ Observation/imaging    (subject → Patient, encounter → Encounter, basedOn → ImagingStudy)
            └─ RiskAssessment *       (subject → Patient, encounter → Encounter, derivedFrom → QuestionnaireResponse)
  [más tarde]
       └─ Observation/histología      (subject → Patient, encounter → Encounter, derivedFrom → QuestionnaireResponse)
```

`*` Solo si `hasMass === true`

---

## Cabeceras HTTP requeridas en todas las peticiones

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <keycloak_token>
```

---

## Orden estricto de peticiones

```
1.  POST /fhir/Patient/check-or-create          → obtener/confirmar patientId
2.  POST /fhir/Encounter                         → requiere patientId
3.  POST /fhir/ImagingStudy                      → requiere patientId, encId
4a. POST /fhir/QuestionnaireResponse  [i=0..N]  → requiere patientId, encId
4b. POST /fhir/Observation            [i=0..N]  → requiere patientId, encId, imgStuId
4c. POST /fhir/RiskAssessment         [i=0..N]  → requiere patientId, encId, qResponseId[i]  (*si hasMass)
5.  POST /fhir/Observation (histología)          → requiere patientId, encId, qResponseId  (posterior)
```

Los pasos 4a, 4b y 4c dentro de cada iteración son secuenciales (4b y 4c dependen del éxito de 4a). Las iteraciones entre sí pueden paralelizarse si el servidor lo permite.
