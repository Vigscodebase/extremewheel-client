import { ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";
import { usePermissions } from "../context/permissioncontext";
import { firstAllowedPath } from "../utils/permissions";

export default function NotAuthorized() {
  const { can } = usePermissions();
  const landing = firstAllowedPath(can);

  return (
    <div className="not-authorized-container">
      <div>
        <div className="not-authorized-icon">
          <ShieldOff size={26} />
        </div>
        <h2 className="not-authorized-title">You don't have access to this page</h2>
        <p className="not-authorized-text">
          An admin controls which pages each account can open. If you need this one, ask them to grant it to your email.
        </p>
        {landing && (
          <Link to={landing} className="btn btn-primary">
            Go to a page you can access
          </Link>
        )}
      </div>
    </div>
  );
}
