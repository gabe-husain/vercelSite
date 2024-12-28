import Image from "next/image";
import Link from "next/link";
import "../../app/globals.css";

export default function Navbar() {
  const pages = [
    { page: "Blog", href: "/blog" },
    { page: "About", href: "/about" },
    { page: "Contact", href: "/contact" },
    { page: "myInv", href: "/myInv" },
  ];

  return (
    <nav className="Navbar navbar-items">
      <Link href="/" className="navbar-logo-container">
        <picture>
          <source
            srcSet="/images/Dark-Mode-Logo.svg"
            media="(prefers-color-scheme: dark)"
          />
          <Image
            src="/images/Light-Mode-Logo.svg"
            fill
            className="Logo"
            alt="homepage logo"
            priority
            sizes="(max-width: 768px) 80px, 120px"
          />
        </picture>
      </Link>
      <div className="navbar-items" style={{ display: "flex" }}>
        {pages.map((page) => (
          <Link
            key={page.page}
            href={{ pathname: page.href }}
            className="navItem"
          >
            {page.page}
          </Link>
        ))}
      </div>
      <div></div>
    </nav>
  );
}
