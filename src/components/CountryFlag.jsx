import { Globe } from "lucide-react";
import { getCountryCode } from "../utils/countries";

export default function CountryFlag({ code, className = "" }) {
  const countryCode = getCountryCode(code);

  if (!countryCode) {
    return <Globe className={className} />;
  }
  return <span className={`fi fi-${countryCode.toLowerCase()} ${className}`} />;
}
