import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);

const locations = [
  {
    name: 'Great Zimbabwe Ruins',
    type: 'Cultural Heritage Site',
    lat: -20.2675,
    lng: 30.9333,
    location: 'Masvingo, Zimbabwe',
    logo: '/assets/great_zim.png',
    payments: { ZiG: false, ZiGT: false, SoulID: true },
    link: 'https://whc.unesco.org/en/list/364/',
  },
  {
    name: 'Mbare Grocery Mart',
    type: 'Retail & Supermarkets',
    lat: -17.865,
    lng: 31.021,
    location: 'Mbare, Harare',
    logo: '/assets/AVF.png',
    payments: { ZiG: true, ZiGT: true, SoulID: false },
    link: 'https://wa.me/263771234567',
  },
  {
    name: 'Tsodilo Hills',
    type: 'Cultural Heritage Site',
    lat: -18.7431,
    lng: 21.7461,
    location: 'Northwest Botswana',
    logo: '/assets/tsodilo.png',
    payments: { ZiG: false, ZiGT: false, SoulID: true },
    link: 'https://whc.unesco.org/en/list/1021/',
  },
  {
    name: 'Robben Island',
    type: 'Cultural Heritage Site',
    lat: -33.806,
    lng: 18.366,
    location: 'Cape Town, South Africa',
    logo: '/assets/robben_island.png',
    payments: { ZiG: false, ZiGT: false, SoulID: true },
    link: 'https://www.robben-island.org.za/',
  },
];

const paymentIcons = {
  ZiG: '💳',
  ZiGT: '🪙',
  SoulID: '🧑‍💻',
};

export default function GameFiMap() {
  useEffect(() => {
    // Fix leaflet icon issue in Next.js
    // @ts-expect-error
    import('leaflet').then(L => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    });
  }, []);

  const tileLayerProps: any = {
    attribution: "&copy; OpenStreetMap contributors",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  };

  return (
    <div style={{ height: '100vh', width: '100vw', maxWidth: '100%' }}>
      {/* @ts-ignore: Suppress MapContainer prop type error due to dynamic import */}
      <MapContainer center={[-6.5, 23.5]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer {...tileLayerProps} />
        {locations.map((loc, i) => (
          <Marker key={i} position={[loc.lat, loc.lng]}>
            <Popup>
              <strong>{loc.name}</strong><br />
              <em>{loc.type}</em><br />
              <small>{loc.location}</small><br />
              Payments: ZiG {loc.payments.ZiG ? '✅' : '❌'} | ZiGT {loc.payments.ZiGT ? '✅' : '❌'} | SoulID {loc.payments.SoulID ? '✅' : '❌'}<br />
              <a href={loc.link} target="_blank" rel="noopener noreferrer">More Info</a><br />
              <img src={loc.logo} alt={loc.name} style={{ width: 100, marginTop: 5 }} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {/* If you see an error, run: npm install react-leaflet leaflet */}
    </div>
  );
} 