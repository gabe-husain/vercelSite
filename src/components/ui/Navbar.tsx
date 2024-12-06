export default function Navbar() {
    const links = ['Blog', 'About'];
    const nav = links.map(
        (link) => 
            (<div key={link} className="element">{link}</div>)
    )
    
    return (
        <nav className="navbar" style={{ display: "flex", gap: "3vw"}}>
            <a href="/" className="Homepage" >
                <img src="https://m.media-amazon.com/images/I/61bRfnGfJTL._AC_UF894,1000_QL80_.jpg" 
                className="home image" 
                style={{ height: "10vw", width: "10vh", objectFit: "contain" }} 
                alt="homepage"/>
            </a>
            <div className="links" style={{ display: "flex", gap: "3vw"}}>
                { nav }
            </div>
        </nav>
    );
}