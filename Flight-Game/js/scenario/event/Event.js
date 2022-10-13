import GameObject from "./GameObject.js";

export default function Event() {
    GameObject.call(this);
}
Event.prototype = new GameObject();
