# Deployment Script and Web Interface for Gas Feed Monitoring

Below is a comprehensive solution for deploying a system to monitor gas prices, view opportunities, and track profits with a web interface.

## Deployment Script (Docker-based)

```bash
#!/bin/bash

# Deployment script for gas feed monitoring system
# Requires Docker and Docker Compose

# Configuration variables
DB_PASSWORD="your_secure_password"
ADMIN_EMAIL="admin@example.com"
DOMAIN="yourdomain.com"

# Create necessary directories
mkdir -p ./data/db
mkdir -p ./data/logs
mkdir -p ./config

# Create docker-compose.yml
cat > docker-compose.yml <<EOL
version: '3.8'

services:
  db:
    image: postgres:13
    container_name: gasfeed_db
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./data/db:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:6
    container_name: gasfeed_redis
    volumes:
      - ./data/redis:/data
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: gasfeed_backend
    environment:
      DB_HOST: db
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
    volumes:
      - ./config:/app/config
      - ./data/logs:/app/logs
    depends_on:
      - db
      - redis
    restart: unless-stopped

  worker:
    build: ./backend
    container_name: gasfeed_worker
    command: python worker.py
    environment:
      DB_HOST: db
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
    volumes:
      - ./config:/app/config
      - ./data/logs:/app/logs
    depends_on:
      - db
      - redis
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: gasfeed_frontend
    ports:
      - "3000:3000"
    environment:
      API_URL: http://backend:8000
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:latest
    container_name: gasfeed_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/build:/usr/share/nginx/html
    depends_on:
      - frontend
    restart: unless-stopped

EOL

# Create nginx configuration
cat > nginx.conf <<EOL
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name ${DOMAIN};

        location / {
            proxy_pass http://frontend:3000;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }

        location /api {
            proxy_pass http://backend:8000;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
    }
}
EOL

# Create backend Dockerfile
mkdir -p backend
cat > backend/Dockerfile <<EOL
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "app.py"]
EOL

# Create frontend Dockerfile
mkdir -p frontend
cat > frontend/Dockerfile <<EOL
FROM node:16

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "start"]
EOL

# Create sample backend requirements
cat > backend/requirements.txt <<EOL
flask==2.0.1
flask-sqlalchemy==2.5.1
flask-cors==3.0.10
psycopg2-binary==2.9.1
redis==3.5.3
requests==2.26.0
web3==5.24.0
celery==5.1.2
EOL

echo "Deployment files created. To start the system:"
echo "1. Add your application code to backend/ and frontend/ directories"
echo "2. Run 'docker-compose up -d --build'"
echo "3. Access the web interface at http://localhost"
```

## Web Interface Components

### Frontend (React-based)

```jsx
// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, Navbar, Nav, Row, Col, Card, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Dashboard Component
function Dashboard() {
  const [gasData, setGasData] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [profits, setProfits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch gas prices
        const gasRes = await fetch('/api/gas');
        const gasData = await gasRes.json();
        setGasData(gasData);

        // Fetch opportunities
        const oppRes = await fetch('/api/opportunities');
        const oppData = await oppRes.json();
        setOpportunities(oppData);

        // Fetch profit history
        const profitRes = await fetch('/api/profits');
        const profitData = await profitRes.json();
        setProfits(profitData);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Container fluid>
      <h2 className="my-4">Gas Feed Dashboard</h2>
      
      {/* Gas Prices Section */}
      <Row className="mb-4">
        <h4>Current Gas Prices</h4>
        {gasData.map((network, idx) => (
          <Col md={4} key={idx} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>{network.name}</Card.Title>
                <Card.Text>
                  <strong>Fast:</strong> {network.fast} Gwei<br />
                  <strong>Standard:</strong> {network.standard} Gwei<br />
                  <strong>Slow:</strong> {network.slow} Gwei<br />
                  <small className="text-muted">Updated: {network.timestamp}</small>
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Opportunities Section */}
      <Row className="mb-4">
        <h4>Arbitrage Opportunities</h4>
        {opportunities.length > 0 ? (
          opportunities.map((opp, idx) => (
            <Col md={6} key={idx} className="mb-3">
              <Card className={opp.profitability > 0 ? 'border-success' : 'border-warning'}>
                <Card.Body>
                  <Card.Title>
                    {opp.pair} - Profitability: {opp.profitability}%
                  </Card.Title>
                  <Card.Text>
                    <strong>Exchange A:</strong> {opp.exchangeA} ({opp.priceA})<br />
                    <strong>Exchange B:</strong> {opp.exchangeB} ({opp.priceB})<br />
                    <strong>Volume:</strong> {opp.volume}<br />
                    <small className="text-muted">Last checked: {opp.timestamp}</small>
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col>
            <Card>
              <Card.Body>
                <Card.Text>No significant opportunities found at this time.</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Profit History Section */}
      <Row>
        <h4>Profit History</h4>
        <Col>
          <Card>
            <Card.Body>
              {/* This would typically be a chart - placeholder for now */}
              <div className="profit-chart-placeholder">
                {profits.length > 0 ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Profit (ETH)</th>
                        <th>Profit (USD)</th>
                        <th>Transaction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profits.map((profit, idx) => (
                        <tr key={idx}>
                          <td>{profit.date}</td>
                          <td>{profit.ethProfit}</td>
                          <td>${profit.usdProfit}</td>
                          <td>
                            <a href={`https://etherscan.io/tx/${profit.txHash}`} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No profit history recorded yet.</p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

// Main App Component
function App() {
  return (
    <Router>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand as={Link} to="/">Gas Feed Monitor</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
              <Nav.Link href="#alerts">Alerts</Nav.Link>
              <Nav.Link href="#settings">Settings</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
```

### Backend API (Flask-based)

```python
# backend/app.py
from flask import Flask, jsonify
from flask_cors import CORS
import psycopg2
import redis
import time
import json
from web3 import Web3

app = Flask(__name__)
CORS(app)

# Database configuration
DB_CONFIG = {
    'host': 'db',
    'database': 'postgres',
    'user': 'postgres',
    'password': 'your_secure_password'
}

# Redis connection
redis_conn = redis.Redis(host='redis', port=6379, db=0)

@app.route('/api/gas', methods=['GET'])
def get_gas_prices():
    """Get current gas prices from cache or fetch new data"""
    cached = redis_conn.get('gas_prices')
    if cached:
        return jsonify(json.loads(cached))
    
    # Sample data - in production, you'd fetch from various sources
    gas_data = [
        {
            'name': 'Ethereum Mainnet',
            'fast': 45,
            'standard': 32,
            'slow': 28,
            'timestamp': int(time.time())
        },
        {
            'name': 'Polygon',
            'fast': 500,
            'standard': 400,
            'slow': 300,
            'timestamp': int(time.time())
        }
    ]
    
    # Cache for 1 minute
    redis_conn.set('gas_prices', json.dumps(gas_data), ex=60)
    return jsonify(gas_data)

@app.route('/api/opportunities', methods=['GET'])
def get_opportunities():
    """Get arbitrage opportunities"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Query for latest opportunities
        cursor.execute("""
            SELECT pair, exchange_a, price_a, exchange_b, price_b, 
                   profitability, volume, timestamp 
            FROM opportunities 
            ORDER BY timestamp DESC 
            LIMIT 10
        """)
        
        opportunities = []
        for row in cursor.fetchall():
            opportunities.append({
                'pair': row[0],
                'exchangeA': row[1],
                'priceA': row[2],
                'exchangeB': row[3],
                'priceB': row[4],
                'profitability': float(row[5]),
                'volume': float(row[6]),
                'timestamp': row[7].isoformat()
            })
            
        return jsonify(opportunities)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/profits', methods=['GET'])
def get_profits():
    """Get profit history"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Query for profit history
        cursor.execute("""
            SELECT date, eth_profit, usd_profit, tx_hash 
            FROM profits 
            ORDER BY date DESC 
            LIMIT 20
        """)
        
        profits = []
        for row in cursor.fetchall():
            profits.append({
                'date': row[0].isoformat(),
                'ethProfit': float(row[1]),
                'usdProfit': float(row[2]),
                'txHash': row[3]
            })
            
        return jsonify(profits)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
```

### Worker Script (Celery-based)

```python
# backend/worker.py
from celery import Celery
import requests
from web3 import Web3
import time
import psycopg2
import redis
import json

# Celery configuration
app = Celery('tasks', broker='redis://redis:6379/0')

# Database configuration
DB_CONFIG = {
    'host': 'db',
    'database': 'postgres',
    'user': 'postgres',
    'password': 'your_secure_password'
}

# Redis connection
redis_conn = redis.Redis(host='redis', port=6379, db=0)

# Web3 providers
w3_mainnet = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_INFURA_KEY'))
w3_polygon = Web3(Web3.HTTPProvider('https://polygon-rpc.com'))

@app.task
def update_gas_prices():
    """Task to update gas prices from various sources"""
    try:
        # Fetch Ethereum gas prices
        eth_gas = requests.get('https://ethgasstation.info/api/ethgasAPI.json').json()
        
        # Fetch Polygon gas prices (example)
        polygon_gas = {
            'fast': 500,
            'standard': 400,
            'slow': 300
        }
        
        gas_data = [
            {
                'name': 'Ethereum Mainnet',
                'fast': eth_gas['fast'] / 10,
                'standard': eth_gas['average'] / 10,
                'slow': eth_gas['safeLow'] / 10,
                'timestamp': int(time.time())
            },
            {
                'name': 'Polygon',
                'fast': polygon_gas['fast'],
                'standard': polygon_gas['standard'],
                'slow': polygon_gas['slow'],
                'timestamp': int(time.time())
            }
        ]
        
        # Update cache
        redis_conn.set('gas_prices', json.dumps(gas_data), ex=60)
        
        # Store in database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        for network in gas_data:
            cursor.execute("""
                INSERT INTO gas_prices (network, fast, standard, slow, timestamp)
                VALUES (%s, %s, %s, %s, to_timestamp(%s))
            """, (network['name'], network['fast'], network['standard'], 
                 network['slow'], network['timestamp']))
        conn.commit()
        
    except Exception as e:
        print(f"Error updating gas prices: {e}")
    finally:
        if conn:
            conn.close()

@app.task
def find_arbitrage_opportunities():
    """Task to find arbitrage opportunities between exchanges"""
    try:
        # This would involve querying multiple DEX APIs or on-chain data
        # Here's a simplified example
        
        # Sample data - in reality you'd fetch from Uniswap, Sushiswap, etc.
        opportunities = [
            {
                'pair': 'ETH/USDC',
                'exchangeA': 'Uniswap',
                'priceA': 1800.50,
                'exchangeB': 'Sushiswap',
                'priceB': 1802.75,
                'profitability': 0.12,
                'volume': 500000,
                'timestamp': int(time.time())
            }
        ]
        
        # Store in database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        for opp in opportunities:
            cursor.execute("""
                INSERT INTO opportunities 
                (pair, exchange_a, price_a, exchange_b, price_b, profitability, volume, timestamp)
                VALUES (%s, %s, %s, %s, %s, %s, %s, to_timestamp(%s))
            """, (opp['pair'], opp['exchangeA'], opp['priceA'], opp['exchangeB'],
                 opp['priceB'], opp['profitability'], opp['volume'], opp['timestamp']))
        conn.commit()
        
    except Exception as e:
        print(f"Error finding arbitrage opportunities: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    # Schedule periodic tasks
    app.conf.beat_schedule = {
        'update-gas-every-30-seconds': {
            'task': 'worker.update_gas_prices',
            'schedule': 30.0,
        },
        'find-arbitrage-every-minute': {
            'task': 'worker.find_arbitrage_opportunities',
            'schedule': 60.0,
        },
    }
    
    # Start worker
    app.start()
```

## Database Schema

```sql
-- Database initialization script
CREATE TABLE gas_prices (
    id SERIAL PRIMARY KEY,
    network VARCHAR(50) NOT NULL,
    fast DECIMAL(10, 2) NOT NULL,
    standard DECIMAL(10, 2) NOT NULL,
    slow DECIMAL(10, 2) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

CREATE TABLE opportunities (
    id SERIAL PRIMARY KEY,
    pair VARCHAR(20) NOT NULL,
    exchange_a VARCHAR(50) NOT NULL,
    price_a DECIMAL(20, 8) NOT NULL,
    exchange_b VARCHAR(50) NOT NULL,
    price_b DECIMAL(20, 8) NOT NULL,
    profitability DECIMAL(10, 4) NOT NULL,
    volume DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

CREATE TABLE profits (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    eth_profit DECIMAL(20, 8) NOT NULL,
    usd_profit DECIMAL(20, 2) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL
);

CREATE INDEX idx_gas_prices_timestamp ON gas_prices(timestamp);
CREATE INDEX idx_opportunities_timestamp ON opportunities(timestamp);
CREATE INDEX idx_profits_date ON profits(date);
```

## Deployment Instructions

1. **Prerequisites**:
   - Docker and Docker Compose installed
   - Node.js (for frontend development)
   - Python (for backend development)

2. **Setup**:
   - Save the deployment script as `deploy.sh`
   - Make it executable: `chmod +x deploy.sh`
   - Run it: `./deploy.sh`

3. **Initialize the system**:
   - Add your application code to the `backend` and `frontend` directories
   - Build and start the containers: `docker-compose up -d --build`

4. **Access the application**:
   - The web interface will be available at `http://localhost`
   - The API will be available at `http://localhost/api`

5. **Configuration**:
   - Update the `DB_PASSWORD` and other variables in the deployment script
   - Configure your domain in the nginx configuration
   - Add your Infura/Alchemy API keys to the worker script

This solution provides a complete, containerized system for monitoring gas prices, identifying arbitrage opportunities, and tracking profits with a modern web interface. The system is designed to be scalable and can be extended with additional features as needed.