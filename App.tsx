import { LogBox } from "react-native";
import * as Updates from "expo-updates";
import Constants from "expo-constants";
import { useEffect } from "react";
import * as FileSystem from "expo-file-system";
import React, { ReactNode } from "react";
import { View, Text } from "react-native";

// Add this outside of any component
const logError = async (error: any) => {
  const errorLog = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    appVersion: Constants.expoConfig?.version,
    updateId: Updates.updateId,
    deviceId: Constants.installationId,
    timestamp: new Date().toISOString(),
  };

  try {
    const logFile = `${FileSystem.documentDirectory}error-log.txt`;
    const errorString = JSON.stringify(errorLog, null, 2);

    // Append to existing log file or create new one
    const exists = await FileSystem.getInfoAsync(logFile);
    if (exists.exists) {
      const currentContent = await FileSystem.readAsStringAsync(logFile);
      await FileSystem.writeAsStringAsync(
        logFile,
        currentContent + "\n" + errorString
      );
    } else {
      await FileSystem.writeAsStringAsync(logFile, errorString);
    }
  } catch (logError) {
    console.error("Failed to write error log:", logError);
  }
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Wrap your entire app in an error boundary component
class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logError({ ...error, info: errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ fontSize: 16, color: "#000" }}>
            An error has occurred. Error details have been logged.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const AppContent = () => {
  useEffect(() => {
    // Setup error logging
    const handleError = (error: Error) => {
      logError(error);
    };

    // Handle uncaught JS errors
    const errorHandler = (event: ErrorEvent) => {
      logError(event.error);
    };

    // Handle promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      logError(event.reason);
    };

    if (__DEV__) {
      LogBox.ignoreLogs(["Require cycle:"]);
    }

    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", rejectionHandler);

    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, []);

  return <View style={{ flex: 1 }}>{/* Your existing app content */}</View>;
};

// Wrap your app's root component with the ErrorBoundary
export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
