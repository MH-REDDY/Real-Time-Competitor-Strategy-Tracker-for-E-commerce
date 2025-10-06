import { Mail, Phone, MapPin, Headphones } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <div className="footer-logo">
            <Headphones size={28} />
            <h3>Ignite</h3>
          </div>
          <p className="footer-description">
            Your ultimate destination for premium audio equipment. Experience sound like never before.
          </p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li><a href="/">Home</a></li>
            <li><a href="/browse-events">Browse Events</a></li>
            <li><a href="/cart">Cart</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Categories</h4>
          <ul className="footer-links">
            <li><a href="/browse-events?category=headphones">Headphones</a></li>
            <li><a href="/browse-events?category=speakers">Speakers</a></li>
            <li><a href="/browse-events?category=earphones">Earphones</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Contact Us</h4>
          <div className="contact-info">
            <div className="contact-item">
              <Mail size={18} />
              <span>support@ignite.com</span>
            </div>
            <div className="contact-item">
              <Phone size={18} />
              <span>+1 234 567 8900</span>
            </div>
            <div className="contact-item">
              <MapPin size={18} />
              <span>123 Audio Street, Sound City</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2025 Ignite. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
