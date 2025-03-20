import TextPage from "@/src/components/layout/Textpage";

export default function PrivacyPolicy() {
  return (
    <TextPage>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy for Web Archive Reader</h1>
        
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="mb-4">
              Last Updated: March 20, 2025
            </p>
            <p className="mb-4">
              This privacy policy explains how Web Archive Reader handles your data and protects your privacy. 
              We are committed to ensuring that your privacy is protected while using our Chrome extension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Data Collection</h2>
            <p className="mb-4">
              <strong>Web Archive Reader does not collect, store, or transmit any personal data.</strong> Our extension operates entirely
              locally within your browser, and all processing occurs on your device. We do not track your browsing history, collect analytics,
              or store any information about the pages you visit or archive.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Local Storage Usage</h2>
            <div className="ml-4">
              <p className="mb-2">We only store the following information locally on your device:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>User Preferences: Basic settings for how the extension functions</li>
                <li>Site Preferences: Your choices for specific sites you've interacted with</li>
              </ul>
              <p className="mt-3">This information is stored only on your device and is never transmitted to any external servers.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Browser Permissions</h2>
            <p className="mb-4">Our extension requires the following permissions to function:</p>
            <div className="ml-4 space-y-4">
              <div>
                <h3 className="font-semibold">webNavigation Permission</h3>
                <p>Used to detect when you navigate to a new page so the extension can respond to your requests for archived content</p>
              </div>
              <div>
                <h3 className="font-semibold">storage Permission</h3>
                <p>Used to store your preferences locally</p>
              </div>
              <div>
                <h3 className="font-semibold">scripting Permission</h3>
                <p>Required to present options when you click the extension icon and handle your selection</p>
              </div>
              <div>
                <h3 className="font-semibold">Host Permissions</h3>
                <p>Required to redirect you to archive.is when you explicitly request to view an archived version of a page</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Third-Party Services</h2>
            <p className="mb-4">
              When you choose to view an archived version of a page, you will be redirected to archive.is, which is a third-party web archiving service.
              Please note that archive.is has its own privacy policy that governs your interactions with their service once you are redirected there.
              We encourage you to review their privacy policy for more information about how they handle your data.
            </p>
            <p className="mb-4">
              We do not integrate with any analytics platforms or other tracking services. All functionality within our extension
              is self-contained and operates locally.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
            <p className="mb-4">
              Since all operations occur locally in your browser and no personal data is collected or transmitted externally,
              your privacy is maintained while using our extension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Children's Privacy</h2>
            <p className="mb-4">
              Our extension does not collect any personal information from any users, including children
              under the age of 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Changes to This Policy</h2>
            <p className="mb-4">
              We may update this privacy policy from time to time to reflect changes in our practices
              or for other operational, legal, or regulatory reasons. We encourage you to periodically
              review this page for the latest information on our privacy practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
            <p className="mb-4">
              For questions or concerns about this privacy policy or the extension's privacy practices,
              please reach out through the Chrome Web Store support channel.
            </p>
          </section>
        </div>
      </div>
    </TextPage>
  );
}