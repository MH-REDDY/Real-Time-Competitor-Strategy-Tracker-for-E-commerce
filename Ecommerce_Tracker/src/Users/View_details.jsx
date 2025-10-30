import { useState } from "react";
import "./View_details.css";

function View_details() {
  const images = [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
  ];

  const [mainImage, setMainImage] = useState(images[0]);

  return (
    <div className="view-details-container">
      <div className="view-details-main">
        {/* Gallery Section */}
        <div className="product-gallery">
          <img className="main-product-img" src={mainImage} alt="Product" />
          <div className="product-thumbnails">
            {images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`thumb-${index}`}
                className={mainImage === img ? "active-thumb" : ""}
                onClick={() => setMainImage(img)}
              />
            ))}
          </div>
        </div>

        {/* Info Section */}
        <div className="product-info">
          <h2>Innovate. Connect. Smartwatch</h2>
          <div className="product-rating">
            <span>★★★★☆</span>
            <span className="in-stock">In Stock</span>
          </div>
          <div className="product-price">$723.00</div>

          <div className="selectors">
            <label>
              Color:
              <select>
                <option>Black</option>
                <option>Silver</option>
                <option>Rose Gold</option>
              </select>
            </label>
            <label>
              Quantity:
              <input type="number" min="1" defaultValue="1" />
            </label>
          </div>

          <button className="add-to-cart-btn">Add to Cart</button>

          <div className="product-accordion">
            <details open>
              <summary>Description</summary>
              <p>
                Experience the next generation of smartwatches with advanced
                health tracking, seamless connectivity, and stylish design.
              </p>
            </details>

            <details>
              <summary>Specifications</summary>
              <ul>
                <li>Display: 1.5" AMOLED</li>
                <li>Battery: 7 days</li>
                <li>Water Resistant: 5ATM</li>
                <li>Connectivity: Bluetooth 5.2</li>
              </ul>
            </details>

            <details>
              <summary>Delivery & Offers</summary>
              <div className="delivery-offers">
                <div className="offer-item">
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span>Free Delivery</span>
                </div>

                <div className="offer-item">
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>One-Time Delivery</span>
                </div>

                <div className="offer-item">
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 3h-8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" />
                  </svg>
                  <span>Gift Wrap Available</span>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="view-details-footer">
        <a href="#">About Us</a>
        <a href="#">Support</a>
        <a href="#">Privacy Policy</a>
      </footer>
    </div>
  );
}
export default View_details;
