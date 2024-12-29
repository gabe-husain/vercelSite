import React, { useState } from 'react';
import TextPage from "@/src/components/layout/Textpage";
import { PDFDocument } from 'pdf-lib';

export default function BookletPage() {
    const [file, setFile] = useState<File | null>(null);

    const createBooklet = async (pdfBytes: ArrayBuffer) => {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const totalPages = pdfDoc.getPageCount();
        
        // Calculate padding needed for multiple of 4
        const remainder = totalPages % 4;
        const paddingNeeded = remainder ? 4 - remainder : 0;
        const totalNeeded = totalPages + paddingNeeded;
        
        // Create new document for booklet
        const bookletDoc = await PDFDocument.create();
        const pages = await bookletDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
        
        // Add blank pages if needed
        if (paddingNeeded > 0) {
            const blankPage = await bookletDoc.addPage();
            for (let i = 0; i < paddingNeeded; i++) {
                pages.push(blankPage);
            }
        }
        
        // Arrange pages in booklet order
        const sheets = totalNeeded / 4;
        for (let sheet = 0; sheet < sheets; sheet++) {
            const lastPage = totalNeeded - 1 - (sheet * 2);
            const firstPage = sheet * 2;
            const secondPage = (sheet * 2) + 1;
            const secondLastPage = totalNeeded - 2 - (sheet * 2);
            
            bookletDoc.addPage(pages[lastPage]);
            bookletDoc.addPage(pages[firstPage]);
            bookletDoc.addPage(pages[secondPage]);
            bookletDoc.addPage(pages[secondLastPage]);
        }
        
        // Create and download the booklet
        const bookletBytes = await bookletDoc.save();
        const blob = new Blob([bookletBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'booklet.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile?.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                await createBooklet(arrayBuffer);
            };
            reader.readAsArrayBuffer(selectedFile);
        }
    };

    return (
        <TextPage>
            <div>
                <h1>PDF Booklet Creator</h1>
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                />
            </div>
        </TextPage>
    );
}