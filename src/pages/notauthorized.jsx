import { ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotAuthorized() {
  return (
    <div className="not-authorized-container">
      <div>
        <div className="not-authorized-icon">
          <ShieldOff size={26} />
        </div>
        <h2 className="not-authorized-title">You don't have access to this page</h2>
        <p className="not-authorized-text">
          An admin has restricted this section for your role. Contact an admin if you think this is a mistake.
        </p>
        <Link to="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}