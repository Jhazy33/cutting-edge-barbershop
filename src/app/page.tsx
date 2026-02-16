import { redirect } from 'next/navigation'

export default function HomePage(): never {
  // Redirect to the homepage that loads the archived design
  redirect('/home')
}
