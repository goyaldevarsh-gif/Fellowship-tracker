export const Mark = ({ size = 36 }: { size?: number }) => (
  <img src={`${import.meta.env.BASE_URL}logo-icon.svg`} width={size} height={size} alt="FellowTrack" className="rounded-xl" />
)
export const Wordmark = ({ size = 22 }: { size?: number }) => (
  <span className="font-extrabold tracking-tight text-navy" style={{ fontSize: size }}>Fellow<span className="text-teal">Track</span></span>
)
