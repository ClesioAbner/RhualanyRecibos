import { useEffect } from "react";
import { useLocation } from "wouter";

export default function HomeRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/emitir");
  }, [setLocation]);

  return null;
}
