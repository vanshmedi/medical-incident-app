export default function FullScreenStatus({ message }: { message: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontSize: 16 }}>
      <div>{message}</div>
    </div>
  );
}


