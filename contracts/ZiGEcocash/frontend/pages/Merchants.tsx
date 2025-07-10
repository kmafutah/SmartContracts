import React, { useState } from 'react';
// @ts-ignore
import QRCode from 'qrcode.react';
import merchantsDataRaw from '../../frontend/merchants.json';
import styles from '../styles/Merchants.module.css';

interface Merchant {
  id: string;
  name: string;
  category: string;
  location: string;
  map: string;
  offerings: string[];
  payments: Record<'ZiG' | 'ZiGT' | 'SoulID', boolean>;
  contact: { link: string; display: string };
  logo?: string;
  verified: boolean;
  trusted: boolean;
  wallet?: string;
}

const merchantsData = merchantsDataRaw as Merchant[];

const categories = [
  'All',
  'Retail & Supermarkets',
  'Transport & Fuel',
  'Airtime & Data Resellers',
  'USD Remittance Agents',
  'Clinics & Pharmacies',
  'Rent Acceptors',
  'Freelancers & Service Providers',
];

type PaymentMethod = 'ZiG' | 'ZiGT' | 'SoulID';
const paymentIcons: Record<PaymentMethod, string> = {
  ZiG: '💳',
  ZiGT: '🪙',
  SoulID: '🧑‍💻',
};

const badge = (verified: boolean, trusted: boolean) =>
  verified ? (
    <span className={styles.verified}>✅ Verified Merchant</span>
  ) : trusted ? (
    <span className={styles.trusted}>🤝 Community Trusted</span>
  ) : null;

const Merchants = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const filtered =
    selectedCategory === 'All'
      ? merchantsData
      : merchantsData.filter((m) => m.category === selectedCategory);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>🌍 ZiG Merchants Network</h1>
      <p className={styles.subtitle}>
        Spend ZiG/ZiGT in the real world. Find trusted vendors, agents, and businesses.
      </p>
      <div className={styles.categories}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={
              cat === selectedCategory ? styles.activeCategory : styles.category
            }
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {filtered.map((m) => (
          <div className={styles.card} key={m.id}>
            {m.logo && (
              <img src={m.logo} alt={m.name} className={styles.logo} />
            )}
            <div className={styles.header}>
              <h2>{m.name}</h2>
              {badge(m.verified, m.trusted)}
            </div>
            <div className={styles.info}>
              <span>📍 <a href={m.map} target="_blank" rel="noopener noreferrer">{m.location}</a></span>
              <span>🎯 {m.offerings.join(', ')}</span>
              <span>
                {Object.entries(m.payments).map(
                  ([method, accepted]) =>
                    accepted && (
                      <span key={method} title={method} className={styles.payment}>
                        {paymentIcons[method as PaymentMethod] || method}
                      </span>
                    )
                )}
              </span>
              <span>🌐 <a href={m.contact.link} target="_blank" rel="noopener noreferrer">{m.contact.display}</a></span>
            </div>
            {m.wallet && (
              <div className={styles.qr}>
                <QRCode value={m.wallet} size={96} />
                <div className={styles.wallet}>{m.wallet}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Merchants; 