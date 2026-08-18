import ConnectedWorkflow from "../../components/home/Connectedworkflow";
import Ecosystem from "../../components/home/Ecosystem";
import Forecasting from "../../components/home/Forecasting";
import Hero from "../../components/home/Hero";
import Industries from "../../components/home/Industries";
import Layer from "../../components/home/Layer";
import Modules from "../../components/home/Modules";
import Pricing from "../../components/home/Pricing";
import Problem from "../../components/home/Problem";
import Productpreview from "../../components/home/Productpreview";
import RolebaseExperiance from "../../components/home/RolebaseExperiance";
import SecurityandControl from "../../components/home/SecurityandControl";

const Home = () => {
  return (
    <div>
      <Hero />
      <Problem />
     <Productpreview />
    <ConnectedWorkflow />
    <Modules />
    <Industries />
      <Ecosystem />
      <Forecasting />
      <Layer />
      <RolebaseExperiance />
      <SecurityandControl />
      <Pricing />
    </div>
  );
};

export default Home;
