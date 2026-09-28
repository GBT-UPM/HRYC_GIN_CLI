import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import TopNavigation from "../components/TopNavigation";
import Footer from "../components/Footer";


const Layout = ({ closeSession, preferred_username, keycloak }) => {
  return (
    <div className="App">
      <Header name={preferred_username} closeSession={closeSession} keycloak={keycloak} />
      <TopNavigation keycloak={keycloak} />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
