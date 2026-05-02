import { useState } from "react";
import GameScreen from "../../components/gamescreen";
import WelcomeScreen from "../../components/welcomescreen";

export default function HomeScreen() {
  const [started, setStarted] = useState(false);

  return started ? (
    <GameScreen />
  ) : (
    <WelcomeScreen onStart={() => setStarted(true)} />
  );
}
