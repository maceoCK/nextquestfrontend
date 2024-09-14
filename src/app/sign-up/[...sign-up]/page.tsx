import { SignUp } from "@clerk/nextjs";
import styles from "./signup.module.css"; // Create this CSS module file

export default function SignUpPage() {
  return (
    <div className={styles.signupContainer + " bg-black"}>
      <SignUp 
        appearance={{
          elements: {
            formButtonPrimary: styles.customButton,
            card: styles.customCard,
          },
        }}
      />
    </div>
  );
}
