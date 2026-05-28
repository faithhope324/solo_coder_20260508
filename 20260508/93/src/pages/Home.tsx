import WeatherMap from '@/components/WeatherMap';
import ControlPanel from '@/components/ControlPanel';
import TimeSlider from '@/components/TimeSlider';
import InfoPanel from '@/components/InfoPanel';
import Legend from '@/components/Legend';

export default function Home() {
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <WeatherMap />
      <ControlPanel />
      <TimeSlider />
      <InfoPanel />
      <Legend />
    </div>
  );
}
