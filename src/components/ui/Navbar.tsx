import Image from 'next/image'
import Link from 'next/link'
import '../../app/globals.css'

export default function Navbar() {
    const links = ['Blog', 'About']
    
    const nav = links.map((link) => (
        <div key={link} className="navItem">
            {link}
        </div>
    ))
    
    return (
        <nav className="Navbar flex" >
            
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
            <div className="siteMap" style={{ display : "flex" }} >
                {nav}
            </div>
        </nav>
    )
}