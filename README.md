# MIA · Interfaz web

Frontend React de MIA (Masses Identification Assistant). El backend, Keycloak, PostgreSQL y el despliegue Docker se mantienen en [HRYC_GIN_SER](https://github.com/GBT-UPM/HRYC_GIN_SER). Para trabajar con la aplicación completa, clonar ambos repositorios como carpetas hermanas y seguir la [guía de desarrollo local](https://github.com/GBT-UPM/HRYC_GIN_SER/blob/develop/deploy/LOCAL.md).

La rama `develop` contiene el trabajo y las candidatas para staging. En adelante, `master` solo avanzará después de la aceptación en staging; su commit actual es un punto de partida, no una versión aprobada para hospital. Los hospitales recibirán las mismas imágenes probadas. La candidata `mia-review-20261006-rc1` es para evaluación clínica con datos ficticios, no una autorización para datos reales.

## Trabajo en la interfaz

Con Node.js y las dependencias ya instaladas, `npm test -- --watch=false --runInBand` ejecuta las pruebas y `npm run build` verifica la compilación de producción. El frontend aislado puede iniciarse con `npm start`, pero para probar autenticación, permisos y flujos completos se recomienda la instalación Docker local descrita en el repositorio del servidor. **No ocupar ni detener los puertos 3000, 8000 y 8001** de otros servicios de desarrollo; la instalación Docker MIA usa `127.0.0.1:18081` en el perfil local.

La imagen de frontend se construye desde este repositorio y se identifica junto con el commit del backend en el manifiesto de la entrega. El procedimiento de promoción, staging, copias y entrega a IT está en [la guía de mantenimiento](https://github.com/GBT-UPM/HRYC_GIN_SER/blob/develop/deploy/MAINTENANCE.md).
