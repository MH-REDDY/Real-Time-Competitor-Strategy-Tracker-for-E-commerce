import "./User_Header.css";

function User_Header() {
    return (
        <div className="User_Header-container">
            <nav className="User-navbar">
                <img src="./Logo.png" />
                <div className="nav-links">
                    <a href="#">New Arrivals</a>
                    <a href="#">Categories</a>
                    <a href="#">Account</a>
                    <div className="cart-icon">
                        <span className="cart-count">1</span>
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    </div>
                </div>
            </nav>
            </div>
    );
}

export default User_Header;