import { FaRegSmile, FaRegMeh, FaRegFrown } from "react-icons/fa";

export const feedbackIcons = {
  good: <FaRegSmile className="text-green-500" size={28} />, // Good
  bad: <FaRegFrown className="text-red-500" size={28} />,   // Bad
  neutral: <FaRegMeh className="text-gray-500" size={28} /> // Neutral
};
