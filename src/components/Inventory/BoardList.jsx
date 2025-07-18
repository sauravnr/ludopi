import { useState, useEffect } from "react";
import Loader from "../Loader";

export default function BoardList() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) return <Loader />;

  return <div className="p-4">Your boards collection goes here.</div>;
}
