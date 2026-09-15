"use client";

import DisposableCameraViewfinder, { DisposableCameraViewfinderProps } from "./DisposableCameraViewfinder";

export interface GuestMomentClientProps extends DisposableCameraViewfinderProps {
  memories?: any[];
}

export default function GuestMomentClient(props: GuestMomentClientProps) {
  return <DisposableCameraViewfinder {...props} />;
}
