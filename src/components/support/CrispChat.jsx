import { useEffect } from "react";

const CRISP_WEBSITE_ID = "4622b88f-af24-41f0-868c-339aca95b729";
const CRISP_SCRIPT_SRC = "https://client.crisp.chat/l.js";
const CRISP_SCRIPT_MARKER = "data-crisp-support-widget";

/**
 * Shows the Crisp live chat widget for as long as this component stays on
 * screen. Injects the loader script + globals itself (no npm dependency -
 * crisp-sdk-web is only a ~3KB typed wrapper around the same window.$crisp
 * push-queue and script tag, so hand-rolling it here avoids adding a
 * package for no functional gain).
 *
 * The script is only ever injected once per page load (window.$crisp is the
 * "already loaded" marker). Mount/unmount after that just calls Crisp's own
 * chat:show / chat:hide API - we deliberately never rip out the script tag,
 * #crisp-chatbox, or the globals. Crisp runs its own internal
 * MutationObserver that watches for its widget DOM being removed and
 * re-injects it as a recovery mechanism; doing that removal ourselves on
 * unmount is exactly what triggers the observer, so the widget reappears on
 * whatever route the user navigated to next. Hiding via the API sidesteps
 * that entirely - the script stays loaded, the widget is just hidden.
 */
export default function CrispChat() {
  useEffect(() => {
    if (!window.$crisp) {
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
      // Crisp's color:theme only accepts named presets, not arbitrary hex -
      // "deep_orange" is the closest available match to the terracotta brand
      // accent (#C1440E). Pixel-exact brand color isn't available on Crisp's
      // free customization tier.
      window.$crisp.push(["config", "color:theme", ["deep_orange"]]);

      const script = document.createElement("script");
      script.src = CRISP_SCRIPT_SRC;
      script.async = true;
      script.setAttribute(CRISP_SCRIPT_MARKER, "true");
      document.head.appendChild(script);
    } else {
      window.$crisp.push(["do", "chat:show"]);
    }

    return () => {
      window.$crisp?.push(["do", "chat:hide"]);
    };
  }, []);

  return null;
}
