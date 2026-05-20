import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ServiceTopology from '../components/ServiceTopology.jsx';
import ServicePanel from '../components/ServicePanel.jsx';

function TopologyPage() {
  const [topology, setTopology] = useState({ nodes: [], edges: [] });
  const [selectedService, setSelectedService] = useState(null);
  const [serviceDetails, setServiceDetails] = useState(null);
  const [errorTraces, setErrorTraces] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTopology = async () => {
    try {
      const response = await axios.get('/api/v1/topology');
      setTopology(response.data);
    } catch (error) {
      console.error('Failed to fetch topology:', error);
    }
  };

  const fetchServiceDetails = async (serviceName) => {
    setLoading(true);
    try {
      const [detailsRes, tracesRes] = await Promise.all([
        axios.get(`/api/v1/services/${serviceName}`),
        axios.get(`/api/v1/services/${serviceName}/error-traces`)
      ]);
      setServiceDetails(detailsRes.data);
      setErrorTraces(tracesRes.data);
    } catch (error) {
      console.error('Failed to fetch service details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
    const interval = setInterval(fetchTopology, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedService) {
      fetchServiceDetails(selectedService);
      const interval = setInterval(() => fetchServiceDetails(selectedService), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedService]);

  const handleNodeClick = (nodeId) => {
    setSelectedService(nodeId);
  };

  return (
    <div>
      <h1 className="page-title">服务拓扑图</h1>
      <div className="topology-container">
        <ServiceTopology
          topology={topology}
          onNodeClick={handleNodeClick}
          selectedService={selectedService}
        />
        <ServicePanel
          serviceName={selectedService}
          details={serviceDetails}
          errorTraces={errorTraces}
          loading={loading}
        />
      </div>
    </div>
  );
}

export default TopologyPage;
