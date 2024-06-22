import Image from "next/image";
import UrlFetcher from "./UrlFetcher";

export default function Home() {
  return (
    <div>
      <h1>Enter a URL to Fetch Data</h1>
      <UrlFetcher />
    </div>
  );
}
