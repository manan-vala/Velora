"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function DeviceRoutingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkDevice = () => {
      // Basic device detection logic based on screen width and user agent
      const isMobileDevice =
        /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        ) || window.innerWidth < 768;

      if (isMobileDevice && pathname === "/") {
        // If mobile and on desktop route, redirect to mobile
        router.replace("/mobile");
      } else if (!isMobileDevice && pathname === "/mobile") {
        // If desktop and on mobile route, redirect to desktop
        router.replace("/");
      }
    };

    // Run check initially
    checkDevice();

    // Optionally re-check on resize (might be annoying if resizing browser window triggers redirect,
    // but useful for testing responsive design or switching orientation)
    // window.addEventListener('resize', checkDevice);
    // return () => window.removeEventListener('resize', checkDevice);
  }, [pathname, router]);

  // Render immediately: the check needs the browser, and holding everything back left
  // every page (including login) blank in the server-rendered HTML.
  return <>{children}</>;
}
