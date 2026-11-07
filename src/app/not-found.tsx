import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container" style={{ paddingBlock: "var(--space-9)", textAlign: "center" }}>
      <p className="caption">404</p>
      <h1 style={{ fontSize: "var(--text-3xl)", marginBlock: "var(--space-3) var(--space-6)" }}>
        Sidan finns inte
      </h1>
      <Button href="/">Till startsidan</Button>
    </div>
  );
}
