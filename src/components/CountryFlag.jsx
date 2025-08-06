import { Globe } from "lucide-react";
import { COUNTRY_CODES } from "../utils/countries";

export default function CountryFlag({ code, className = "" }) {
  if (
    !code ||
    typeof code !== "string" ||
    code.toLowerCase() === "worldwide" ||
    !COUNTRY_CODES.includes(code.toUpperCase())
  ) {
    return <Globe className={className} />;
  }
  return <span className={`fi fi-${code.toLowerCase()} ${className}`} />;
}
