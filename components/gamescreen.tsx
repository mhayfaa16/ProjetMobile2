import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

type Candy = {
  id: number;
  x: number;
  y: number;
  speed: number;
};

export default function GameScreen() {
  const [showReady, setShowReady] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [showGo, setShowGo] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [candies, setCandies] = useState<Candy[]>([]);
  const [score, setScore] = useState(0);
  const [showPlusOne, setShowPlusOne] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showPausePopup, setShowPausePopup] = useState(false);
  const [showGameOverPopup, setShowGameOverPopup] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState("");
  const plusOneAnim = useRef(new Animated.Value(0)).current;

  const basketX = useRef(width / 2 - 50);
  const basketWidth = 100;
  const basketHeight = 60;
  const basketBottomMargin = 60;

  // Refs for intervals and timeouts
  const spawnInterval = useRef<number | null>(null);
  const animationInterval = useRef<number | null>(null);
  const countdownTimeouts = useRef<number[]>([]);

  // Clear all intervals
  const clearAllIntervals = () => {
    if (spawnInterval.current) {
      clearInterval(spawnInterval.current);
      spawnInterval.current = null;
    }
    if (animationInterval.current) {
      clearInterval(animationInterval.current);
      animationInterval.current = null;
    }
  };

  // Clear all countdown timeouts
  const clearCountdownTimeouts = () => {
    countdownTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    countdownTimeouts.current = [];
  };

  // Game over function
  const gameOver = (message: string) => {
    if (!gameActive) return; // Prevent multiple triggers

    setGameActive(false);
    setIsPaused(false);
    setGameOverMessage(message);
    setShowGameOverPopup(true);
    clearAllIntervals();
  };

  // Reset game completely
  const resetGame = () => {
    // Clear all game loops
    clearAllIntervals();
    clearCountdownTimeouts();

    // Reset all state
    setGameActive(false);
    setIsPaused(false);
    setShowPausePopup(false);
    setShowGameOverPopup(false);
    setCandies([]);
    setScore(0);
    setShowPlusOne(false);
    setGameOverMessage("");

    // Small delay to ensure clean state
    setTimeout(() => {
      startCountdown();
    }, 50);
  };

  // Start the countdown sequence
  const startCountdown = () => {
    // Reset states first
    setShowReady(true);
    setCountdown(3);
    setShowGo(false);
    setGameActive(false);
    setShowGameOverPopup(false);

    // Clear any existing timeouts
    clearCountdownTimeouts();

    // Start the sequence
    const readyTimer = setTimeout(() => {
      setShowReady(false);

      // Countdown 2
      const countdown2 = setTimeout(() => {
        setCountdown(2);
      }, 1000);

      // Countdown 1
      const countdown1 = setTimeout(() => {
        setCountdown(1);
      }, 2000);

      // Show GO
      const goTimer = setTimeout(() => {
        setShowGo(true);
      }, 3000);

      // Start game and clear all countdown display
      const startGameTimer = setTimeout(() => {
        setShowGo(false);
        setCountdown(0);
        setGameActive(true);
      }, 3800);

      countdownTimeouts.current.push(
        countdown2,
        countdown1,
        goTimer,
        startGameTimer,
      );
    }, 1200);

    countdownTimeouts.current.push(readyTimer);
  };

  // Initialize game on mount
  useEffect(() => {
    startCountdown();

    return () => {
      clearAllIntervals();
      clearCountdownTimeouts();
    };
  }, []);

  // Pan responder for basket movement
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (evt, gestureState) => {
        let newX = gestureState.moveX - basketWidth / 2;
        newX = Math.max(10, Math.min(newX, width - basketWidth - 10));
        basketX.current = newX;
      },
    }),
  ).current;

  // Spawn candies
  useEffect(() => {
    if (!gameActive || isPaused) return;

    if (spawnInterval.current) clearInterval(spawnInterval.current);

    spawnInterval.current = setInterval(() => {
      const newCandy: Candy = {
        id: Date.now(),
        x: Math.random() * (width - 60) + 30,
        y: 50,
        speed: Math.random() * 3 + 2,
      };
      setCandies((prev) => [...prev, newCandy]);
    }, 800);

    return () => {
      if (spawnInterval.current) {
        clearInterval(spawnInterval.current);
        spawnInterval.current = null;
      }
    };
  }, [gameActive, isPaused]);

  // Animate candies falling and collision detection
  useEffect(() => {
    if (!gameActive || isPaused) return;

    if (animationInterval.current) clearInterval(animationInterval.current);

    animationInterval.current = setInterval(() => {
      setCandies((prevCandies) => {
        const updatedCandies: Candy[] = [];
        let newScore = 0;

        // Basket collision boundaries - expanded hitbox for faster detection
        const basketTop = height - basketBottomMargin - basketHeight;
        const basketLeft = basketX.current - 20; // Expanded left
        const basketRight = basketX.current + basketWidth + 20; // Expanded right
        const basketBottom = height - basketBottomMargin + 20; // Expanded down

        for (const candy of prevCandies) {
          let newY = candy.y + candy.speed;

          // Candy collision boundaries - generous hitbox
          const candyRadius = 25; // Radius from center
          const candyBottom = newY + candyRadius;
          const candyLeft = candy.x - candyRadius;
          const candyRight = candy.x + candyRadius;

          // Check collision with basket - detects earlier as candy approaches
          if (
            candyBottom >= basketTop - 30 && // Trigger earlier when approaching
            candyLeft < basketRight &&
            candyRight > basketLeft &&
            newY < basketBottom
          ) {
            // Candy caught!
            newScore++;
            // Show +1 animation at basket position
            setShowPlusOne(true);
            plusOneAnim.setValue(0);
            Animated.timing(plusOneAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start(() => setShowPlusOne(false));
            continue; // Skip adding this candy back
          }

          // 🚨 GAME OVER CONDITION: Candy hits the ground
          // Check if candy reaches the ground (bottom of screen)
          const groundLevel = height - 50;
          if (newY + 40 >= groundLevel) {
            // Candy hit the ground - GAME OVER
            gameOver("💥 A candy hit the ground! Game Over! 💥");
            return []; // Return empty array to clear all candies
          }

          // Remove candy if it falls past the bottom (safety check)
          if (newY > height - 50) {
            continue;
          }

          updatedCandies.push({
            ...candy,
            y: newY,
          });
        }

        if (newScore > 0) {
          setScore((prev) => prev + newScore);
        }

        return updatedCandies;
      });
    }, 16); // 60fps

    return () => {
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
        animationInterval.current = null;
      }
    };
  }, [gameActive, isPaused]);

  const handlePause = () => {
    if (gameActive && !isPaused) {
      setIsPaused(true);
      setShowPausePopup(true);
    }
  };

  const handleResume = () => {
    setShowPausePopup(false);
    setIsPaused(false);
  };

  const handleRetry = () => {
    resetGame();
  };

  const plusOneTranslateY = plusOneAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -50],
  });

  const plusOneOpacity = plusOneAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.7, 0],
  });

  return (
    <ImageBackground
      source={require("../assets/images/2.png")}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Top Container for ready, countdown, and GO */}
      <View style={styles.topContainer}>
        {showReady && <Text style={styles.readyText}>Are you ready?</Text>}
        {!showReady && countdown > 0 && !showGo && (
          <Text style={styles.countdownText}>{countdown}</Text>
        )}
        {showGo && <Text style={styles.goText}>GO!</Text>}
      </View>

      {/* Score Display */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>🍬 {score}</Text>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={handlePause}>
          <Image
            source={require("../assets/images/p.png")}
            style={styles.controlButtonImage}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={handleRetry}>
          <Image
            source={require("../assets/images/r.png")}
            style={styles.controlButtonImage}
          />
        </TouchableOpacity>
      </View>

      {/* Candies */}
      {candies.map((candy) => (
        <Animated.View
          key={candy.id}
          style={[
            styles.candy,
            {
              left: candy.x - 20,
              top: candy.y,
            },
          ]}
        >
          <Text style={styles.candyEmoji}>🍬</Text>
        </Animated.View>
      ))}

      {/* +1 Animation */}
      {showPlusOne && (
        <Animated.View
          style={[
            styles.plusOneContainer,
            {
              transform: [{ translateY: plusOneTranslateY }],
              opacity: plusOneOpacity,
              left: basketX.current + basketWidth / 2 - 25,
              bottom: basketBottomMargin + basketHeight + 10,
            },
          ]}
        >
          <Text style={styles.plusOneText}>+1 🐰</Text>
        </Animated.View>
      )}

      {/* Basket - Movable with bottom margin 60 */}
      <View
        {...panResponder.panHandlers}
        style={[
          styles.basket,
          {
            left: basketX.current,
            bottom: basketBottomMargin,
          },
        ]}
      >
        <Text style={styles.basketEmoji}>🧺</Text>
      </View>

      {/* Pause Popup Modal */}
      <Modal
        transparent={true}
        visible={showPausePopup}
        animationType="fade"
        onRequestClose={handleResume}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCircle}>
            <Text style={styles.modalTitle}>Why we stopping🫣</Text>
            <Text style={styles.modalTextCircle}>Hurry up!!</Text>
            <TouchableOpacity
              style={styles.modalButtonCircle}
              onPress={handleResume}
            >
              <Text style={styles.modalButtonText}>Resume</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Game Over Popup Modal */}
      <Modal
        transparent={true}
        visible={showGameOverPopup}
        animationType="fade"
        onRequestClose={() => setShowGameOverPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentGameOver}>
            <Text style={styles.modalTitleGameOver}>😭 GAME OVER 😭</Text>
            <Text style={styles.gameOverMessage}>{gameOverMessage}</Text>
            <Text style={styles.finalScoreText}>Your Score: {score} 🍬</Text>
            <TouchableOpacity
              style={styles.modalButtonGameOver}
              onPress={resetGame}
            >
              <Text style={styles.modalButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topContainer: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  readyText: {
    fontSize: 36,
    fontWeight: "600",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  countdownText: {
    fontSize: 72,
    fontWeight: "800",
    color: "#ffafcc",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  goText: {
    fontSize: 56,
    fontWeight: "bold",
    color: "#4ADE80",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  scoreContainer: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#FFD966",
    zIndex: 10,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFD966",
  },
  controlsContainer: {
    position: "absolute",
    top: 70,
    left: 30,
    flexDirection: "row",
    gap: 12,
    zIndex: 10,
  },
  controlButton: {
    width: 45,
    height: 45,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFD966",
  },
  controlButtonText: {
    fontSize: 24,
  },
  controlButtonImage: {
    width: 44.9,
    height: 44.9,
  },
  candy: {
    position: "absolute",
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  candyEmoji: {
    fontSize: 36,
  },
  basket: {
    position: "absolute",
    width: 100,
    height: 60,
    backgroundColor: "rgba(139, 69, 19, 0.9)",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#CD853F",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  basketEmoji: {
    fontSize: 40,
  },
  plusOneContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  plusOneText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFD966",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContentCircle: {
    width: 260,
    padding: 24,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#FFD966",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4ADE80",
    marginBottom: 8,
    textAlign: "center",
  },
  modalTextCircle: {
    fontSize: 18,
    color: "#333333",
    textAlign: "center",
    marginBottom: 16,
  },
  modalButtonCircle: {
    backgroundColor: "#FFD966",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
  },
  // Game Over Modal Styles
  modalContentGameOver: {
    width: 300,
    padding: 24,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 3,
    borderColor: "#FF4444",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitleGameOver: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FF4444",
    marginBottom: 16,
    textAlign: "center",
  },
  gameOverMessage: {
    fontSize: 16,
    color: "#333333",
    textAlign: "center",
    marginBottom: 12,
  },
  finalScoreText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFD966",
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtonGameOver: {
    backgroundColor: "#FF4444",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
