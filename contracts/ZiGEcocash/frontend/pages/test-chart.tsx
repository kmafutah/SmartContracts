import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale);

const data = {
  labels: ['Jan', 'Feb', 'Mar'],
  datasets: [{ label: 'Test', data: [1, 2, 3] }]
};

export default function TestChart() {
  return <Chart type="line" data={data} />;
} 