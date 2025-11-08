import './Home.css'

export const Home = () => {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Home Page</h1>
      </header>

      <main className="home-content">
        <div className="welcome-message">
          <h2>Welcome to BookSmart Library Management System</h2>
          <p>
            Manage your library resources efficiently and effectively.
            Use the side menu to navigate through different features.
          </p>
        </div>
      </main>
    </div>
  )
}

export default Home