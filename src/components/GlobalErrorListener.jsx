import { useEffect, useState } from "react";
import ErrorModal from "./ErrorModal";

export default function GlobalErrorListener() {
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        // Listens for the custom "api-error" event dispatched by Axios
        const handleApiError = (event) => {
            setErrorMsg(event.detail);
        };

        window.addEventListener("api-error", handleApiError);

        return () => {
            window.removeEventListener("api-error", handleApiError);
        };
    }, []);

    return (
        <ErrorModal
            open={!!errorMsg}
            onClose={() => setErrorMsg("")}
            message={errorMsg}
        />
    );
}