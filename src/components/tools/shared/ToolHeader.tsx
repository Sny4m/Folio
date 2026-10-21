import { Link } from "react-router-dom";
import { ArrowLeft, LockKeyhole } from "lucide-react";
export default function ToolHeader({
  title,
  highlight,
  description,
}: {
  title: string;
  highlight?: string;
  description: string;
}) {
  return (
    <header className="tool-heading">
      <Link to="/?section=all" className="back-link">
        <ArrowLeft size={15} /> All tools
      </Link>
      <div className="eyebrow">YOUR FILES. YOUR DEVICE.</div>
      <h1>
        {title}
        {highlight && <> {highlight}</>}
        <span className="heading-period">.</span>
      </h1>
      <p>{description}</p>
      <span className="local-badge">
        <LockKeyhole size={13} /> Processed on your device · Made by Sanyam
      </span>
    </header>
  );
}
