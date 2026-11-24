/* From Uiverse.io by anand_4957 - https://uiverse.io/anand_4957/moody-ladybug-99
   MIT License, Copyright (c) anand_4957 (Anand Kotadiya) */
import React from "react";
import "./LoginSpeedLoader.css";

export default function LoginSpeedLoader() {
  return <div className="login-speed-scene" aria-hidden="true">
    <div className="login-speeder">
      <span><span /><span /><span /><span /></span>
      <div className="login-speed-base"><span /><div className="login-speed-face" /></div>
    </div>
    <div className="login-speed-lines"><span /><span /><span /><span /></div>
  </div>;
}
