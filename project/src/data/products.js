import { placeholderImages } from '../utils/placeholderImages';

export const products = [
  {
    id: 1,
    name: 'Premium Wireless Headphones',
    brand: 'Sony',
    category: 'Headphones',
    price: 299.99,
    image: placeholderImages.headphone1,
    images: [
      placeholderImages.headphone1,
      placeholderImages.headphone1,
      placeholderImages.headphone1
    ],
    description: 'Experience crystal-clear audio with our premium wireless headphones featuring active noise cancellation and 30-hour battery life.',
    specifications: [
      { label: 'Driver Size', value: '40mm' },
      { label: 'Frequency Response', value: '20Hz - 20kHz' },
      { label: 'Impedance', value: '32 Ohms' },
      { label: 'Battery Life', value: '30 hours' },
      { label: 'Bluetooth Version', value: '5.0' },
      { label: 'Weight', value: '250g' }
    ],
    features: [
      'Active Noise Cancellation',
      'Premium Sound Quality',
      'Comfortable Design',
      'Long Battery Life',
      'Quick Charge Support'
    ]
  },
  {
    id: 2,
    name: 'Bluetooth Speaker Pro',
    brand: 'JBL',
    category: 'Speakers',
    price: 199.99,
    image: placeholderImages.speaker1,
    images: [
      placeholderImages.speaker1,
      placeholderImages.speaker1,
      placeholderImages.speaker1
    ],
    description: 'Powerful portable speaker with 360-degree sound, waterproof design, and 20 hours of playtime.',
    specifications: [
      { label: 'Output Power', value: '30W' },
      { label: 'Frequency Range', value: '60Hz - 20kHz' },
      { label: 'Battery Life', value: '20 hours' },
      { label: 'Bluetooth Version', value: '5.1' },
      { label: 'Water Resistance', value: 'IPX7' },
      { label: 'Weight', value: '960g' }
    ],
    features: [
      '360-degree Sound',
      'Waterproof Design',
      'PartyBoost Compatible',
      'Long Battery Life',
      'Durable Build'
    ]
  },
  {
    id: 3,
    name: 'True Wireless Earbuds',
    brand: 'Apple',
    category: 'Earphones',
    price: 249.99,
    image: placeholderImages.earphone1,
    images: [
      placeholderImages.earphone1,
      placeholderImages.earphone1,
      placeholderImages.earphone1
    ],
    description: 'Premium true wireless earbuds with adaptive EQ, spatial audio, and sweat resistance.',
    specifications: [
      { label: 'Driver Size', value: '10mm' },
      { label: 'Frequency Response', value: '20Hz - 20kHz' },
      { label: 'Battery Life', value: '6 hours' },
      { label: 'Charging Case', value: '24 hours total' },
      { label: 'Bluetooth Version', value: '5.0' },
      { label: 'Weight', value: '5.4g per earbud' }
    ],
    features: [
      'Adaptive EQ',
      'Spatial Audio',
      'Sweat Resistant',
      'Quick Pairing',
      'Touch Controls'
    ]
  },
  {
    id: 4,
    name: 'Studio Monitor Headphones',
    brand: 'Audio-Technica',
    category: 'Headphones',
    price: 349.99,
    image: placeholderImages.headphone2,
    images: [
      placeholderImages.headphone2,
      placeholderImages.headphone2,
      placeholderImages.headphone2
    ],
    description: 'Professional studio-quality headphones with exceptional clarity and accurate sound reproduction.',
    specifications: [
      { label: 'Driver Size', value: '45mm' },
      { label: 'Frequency Response', value: '15Hz - 28kHz' },
      { label: 'Impedance', value: '38 Ohms' },
      { label: 'Cable Length', value: '3m' },
      { label: 'Weight', value: '285g' },
      { label: 'Type', value: 'Wired' }
    ],
    features: [
      'Professional Sound',
      'Exceptional Clarity',
      'Comfortable Fit',
      'Detachable Cable',
      'Studio Quality'
    ]
  },
  {
    id: 5,
    name: 'Smart Home Speaker',
    brand: 'Amazon',
    category: 'Speakers',
    price: 99.99,
    image: placeholderImages.speaker2,
    images: [
      placeholderImages.speaker2,
      placeholderImages.speaker2,
      placeholderImages.speaker2
    ],
    description: 'Voice-controlled smart speaker with premium sound and built-in smart home hub.',
    specifications: [
      { label: 'Output Power', value: '10W' },
      { label: 'Drivers', value: '2 x 20mm tweeters' },
      { label: 'Voice Assistant', value: 'Alexa' },
      { label: 'Connectivity', value: 'WiFi, Bluetooth' },
      { label: 'Weight', value: '780g' },
      { label: 'Dimensions', value: '144mm x 144mm' }
    ],
    features: [
      'Voice Control',
      'Smart Home Hub',
      'Multi-room Audio',
      'Premium Sound',
      'Easy Setup'
    ]
  },
  {
    id: 6,
    name: 'Sport Wireless Earbuds',
    brand: 'Beats',
    category: 'Earphones',
    price: 149.99,
    image: placeholderImages.earphone2,
    images: [
      placeholderImages.earphone2,
      placeholderImages.earphone2,
      placeholderImages.earphone2
    ],
    description: 'Secure-fit wireless earbuds designed for workouts with sweat and water resistance.',
    specifications: [
      { label: 'Driver Size', value: '8.2mm' },
      { label: 'Battery Life', value: '9 hours' },
      { label: 'Charging Case', value: '24 hours total' },
      { label: 'Water Resistance', value: 'IPX4' },
      { label: 'Bluetooth Version', value: '5.0' },
      { label: 'Weight', value: '5.6g per earbud' }
    ],
    features: [
      'Secure Fit',
      'Sweat Resistant',
      'Powerful Bass',
      'Quick Charge',
      'Voice Assistant'
    ]
  },
  {
    id: 7,
    name: 'Gaming Headset RGB',
    brand: 'Razer',
    category: 'Headphones',
    price: 179.99,
    image: placeholderImages.headphone3,
    images: [
      placeholderImages.headphone3,
      placeholderImages.headphone3,
      placeholderImages.headphone3
    ],
    description: 'Immersive gaming headset with 7.1 surround sound and customizable RGB lighting.',
    specifications: [
      { label: 'Driver Size', value: '50mm' },
      { label: 'Frequency Response', value: '12Hz - 28kHz' },
      { label: 'Microphone', value: 'Retractable' },
      { label: 'Connectivity', value: 'USB, 3.5mm' },
      { label: 'RGB Zones', value: '16.8 million colors' },
      { label: 'Weight', value: '322g' }
    ],
    features: [
      '7.1 Surround Sound',
      'RGB Lighting',
      'Noise-Canceling Mic',
      'Memory Foam Cushions',
      'Cross-Platform'
    ]
  },
  {
    id: 8,
    name: 'Portable Bluetooth Speaker',
    brand: 'Bose',
    category: 'Speakers',
    price: 129.99,
    image: placeholderImages.speaker3,
    images: [
      placeholderImages.speaker3,
      placeholderImages.speaker3,
      placeholderImages.speaker3
    ],
    description: 'Compact speaker delivering big sound with up to 12 hours of battery life.',
    specifications: [
      { label: 'Output Power', value: '12W' },
      { label: 'Battery Life', value: '12 hours' },
      { label: 'Bluetooth Range', value: '30 feet' },
      { label: 'Water Resistance', value: 'IPX4' },
      { label: 'Weight', value: '290g' },
      { label: 'Dimensions', value: '180mm x 51mm' }
    ],
    features: [
      'Compact Design',
      'Big Sound',
      'Water Resistant',
      'Voice Prompts',
      'Built-in Mic'
    ]
  }
];
