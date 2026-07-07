// export const uploadFile = async (file: File) => {
//   const formData = new FormData();

//   formData.append("file", file);

//   const response = await fetch(
//     "${process.env.NEXT_PUBLIC_BACKEND_URL}api/files/upload",
//     {
//       method: "POST",
//       body: formData,
//     }
//   );

//   if (!response.ok) {
//     throw new Error("File upload failed");
//   }

//   return await response.text();
// };

function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
}

export const uploadFile = async (file: File) => {
  const formData = new FormData();

  formData.append("file", file);

  // FIX: was using "..." (double quotes) so ${...} never interpolated —
  // the request URL was literally the string "${process.env...}api/files/upload".
  // Must use backticks, plus a "/" before "api/files/upload".
  const response = await fetch(
    `${getApiBase()}/api/files/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("File upload failed");
  }

  return await response.text();
};