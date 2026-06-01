import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

jest.mock('@react-keycloak/web', () => ({
  useKeycloak: () => ({
    initialized: true,
    keycloak: {
      authenticated: true,
      token: 'token',
      logout: jest.fn(),
      tokenParsed: {
        preferred_username: 'tester',
        given_name: 'Test',
        family_name: 'User',
        realm_access: {
          roles: ['ROLE_SITE_COORDINATOR', 'practitioner'],
        },
        allowed_centers: ['HURYC'],
        resource_access: {},
      },
    },
  }),
}));

jest.mock('./screens/MainScreen', () => () => <div>Panel de prueba</div>);
jest.mock('./screens/QuestionnaireScreen', () => () => <div>Cuestionario</div>);
jest.mock('./screens/ResponsesScreen', () => () => <div>Respuestas</div>);
jest.mock('./screens/DownloadScreen', () => () => <div>Descargas</div>);
jest.mock('./screens/EncountersScreen', () => () => <div>Citas</div>);
jest.mock('./screens/PendingParticipantsScreen', () => () => <div>Participantes pendientes pantalla</div>);

test('renders app layout for authenticated users', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  expect(screen.getByText('Panel de prueba')).toBeInTheDocument();
  expect(screen.getByText('Participantes pendientes')).toBeInTheDocument();
});
