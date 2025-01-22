import TextPage from "@/src/components/layout/Textpage";

export default function PrivacyPolicy() {
  return (
    <TextPage>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy for Dual Subtitle Overlay</h1>
        
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="mb-4">
              Last Updated: January 22, 2025
            </p>
            <p className="mb-4">
              This privacy policy explains how Dual Subtitle Overlay handles your data and protects your privacy. 
              We are committed to ensuring that your privacy is protected while using our Chrome extension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Data Collection</h2>
            <p className="mb-4">
              Dual Subtitle Overlay does not collect, store, or transmit any personal data. Our extension operates entirely
              locally within your browser, and all data processing occurs on your device.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Local Storage Usage</h2>
            <div className="ml-4">
              <p className="mb-2">We only store the following information locally on your device:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Subtitle Files: Temporarily stored locally for playback purposes</li>
                <li>Display Preferences: Basic settings such as timing and color preferences</li>
                <li>Synchronization Settings: Timing adjustments for subtitle tracks</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Browser Permissions</h2>
            <p className="mb-4">Our extension requires the following permissions to function:</p>
            <div className="ml-4 space-y-4">
              <div>
                <h3 className="font-semibold">activeTab Permission</h3>
                <p>Used only to display subtitles on the current video being watched</p>
              </div>
              <div>
                <h3 className="font-semibold">scripting Permission</h3>
                <p>Required to create and manage the subtitle overlay interface</p>
              </div>
              <div>
                <h3 className="font-semibold">storage Permission</h3>
                <p>Used to store subtitle files and preferences locally</p>
              </div>
              <div>
                <h3 className="font-semibold">Host Permission</h3>
                <p>Enables functionality across different video websites</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Third-Party Services</h2>
            <p className="mb-4">
              We do not integrate with any third-party services or analytics platforms. All functionality
              is self-contained within the extension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
            <p className="mb-4">
              Since all operations occur locally in your browser and no data is transmitted externally,
              your subtitle files and preferences remain secure on your device.
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
              please reach out through the Chrome Web Store support channel or file an issue on our
              GitHub repository.
            </p>
          </section>
        </div>
      </div>
    </TextPage>
  );
}