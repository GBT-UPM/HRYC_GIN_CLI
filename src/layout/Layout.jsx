import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { Container } from "react-bootstrap";


const Layout = ({ children, sidebarOpen,toggleSidebar,handleDownload,closeSession,preferred_username,isAdmin,keycloak}) => {
  return (
    // <><div style={{ display: "flex", minHeight: "100vh" }}>
    //   {/* Menú lateral o Header */}
    //   <aside style={{ width: "250px", background: "#eee", padding: "20px" }}>

    //     <nav>
    //       <ul>
    //         <li><a href="/dashboard">Dashboard</a></li>
    //         <li><a href="/patients">Pacientes</a></li>
    //         <li><a href="/settings">Configuración</a></li>
    //       </ul>
    //     </nav>
    //   </aside>

    //   {/* Contenido principal */}
    //   <main style={{ flex: 1, padding: "20px" }}>
    //     <Header />
    //     {children}
    //   </main>
    // </div>
    <Container className="App">
        {/*} <Header name={keycloak.tokenParsed.preferred_username} />{*/}
        <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} download={handleDownload} keycloak={keycloak} />
        <div className="main-content">
          <Header name={preferred_username} closeSession={closeSession} keycloak={keycloak} />
          <Outlet />
          {/* <Footer/> */}
        </div>
      </Container>

  );
};

export default Layout;
