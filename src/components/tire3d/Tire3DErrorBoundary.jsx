import { Component } from "react";

export default class Tire3DErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Non-fatal — this is an optional visual enhancement, not core
    // functionality, so we just log it rather than surfacing noise to the user.
    console.warn("3D tire visualizer failed to render:", error?.message || error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
