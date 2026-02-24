import PDFDocument from "pdfkit";
import Job from "../models/Job.js";
import path from "path";
import fs from "fs";
import axios from "axios"; // ✅ Add axios for downloading images

// ✅ Helper function to download image from URL to temp file
const downloadImageToTemp = async (imageUrl) => {
  if (!imageUrl) return null;
  
  try {
    // Download the image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    
    // Create temp file path
    const tempDir = path.resolve("temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFileName = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    // Write to temp file
    fs.writeFileSync(tempFilePath, response.data);
    
    return tempFilePath;
  } catch (error) {
    console.error("Error downloading image:", error.message);
    return null;
  }
};

// ✅ Helper function to clean up temp files
const cleanupTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("Error cleaning up temp file:", err.message);
    }
  }
};

// ✅ Updated: getImagePath - now downloads Cloudinary URLs to temp files
const getImagePath = async (imageUrl) => {
  if (!imageUrl) return null;
  
  // If it's a local file path
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    const localPath = path.resolve(`uploads/${path.basename(imageUrl)}`);
    if (fs.existsSync(localPath)) {
      return localPath;
    }
    return null;
  }
  
  // If it's a Cloudinary URL, download to temp file
  return await downloadImageToTemp(imageUrl);
};

export const generateJobReport = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id).populate("category categoryPath").lean();
    if (!job) return res.status(404).json({ message: "Job not found" });

    const doc = new PDFDocument({ margin: 30, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment");

    doc.pipe(res);

    // ✅ Function to draw the header
    const drawHeader = () => {
      const logoPath = path.resolve("public/logo.png");
      doc.image(logoPath, 30, 30, { width: 80 });

      doc.fontSize(16).text("HINO MOTORS PHILIPPINE CORPORATION", 0, 40, { align: "center" });
      doc.fontSize(12).text("Manufacturing Division", { align: "center" });
      doc.text("QA Department", { align: "center" });
      doc.moveDown();
      doc.fontSize(14).text("FINAL INSPECTION CHECKLIST", { align: "center" });
      doc.fontSize(12).text(`Category: ${job.category.name}`, { align: "center" });

      doc.moveDown(2);
    };

    // ✅ Function to draw job info
    const drawJobInfoTables = () => {
      const leftX = 30;
      const rightX = 300;
      const tableWidth = 240;
      const rowHeight = 20;
      const startY = doc.y;

      const leftData = [
        `Customer: ${job.jobInfo?.customer || "N/A"}`,
        `Model: ${job.jobInfo?.model || "N/A"}`,
        `Body Type: ${job.jobInfo?.bodyType || "N/A"}`,
        `Chassis No.: ${job.jobInfo?.chassisNum || "N/A"}`,
        `Engine No.: ${job.jobInfo?.engineNum || "N/A"}`
      ];

      const rightData = [
        `Date: ${new Date(job.jobInfo?.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        `JO No.: ${job.jobInfo?.joNo || "N/A"}`,
        `C/S No.: ${job.jobInfo?.csNo || "N/A"}`,
        `Key No.: ${job.jobInfo?.keyNumber || "N/A"}`,
        `Job Type: ${job.jobInfo?.jobType || "N/A"}`
      ];

      doc.font("Helvetica").fontSize(10);
      leftData.forEach((text, idx) => {
        let y = startY + idx * rowHeight;
        doc.text(text, leftX + 5, y + 5, { width: tableWidth - 10 });
        doc.moveTo(leftX, y).lineTo(leftX + tableWidth, y).stroke();
        doc.moveTo(leftX, y + rowHeight).lineTo(leftX + tableWidth, y + rowHeight).stroke();
        doc.moveTo(leftX, y).lineTo(leftX, y + rowHeight).stroke();
        doc.moveTo(leftX + tableWidth, y).lineTo(leftX + tableWidth, y + rowHeight).stroke();
      });

      rightData.forEach((text, idx) => {
        let y = startY + idx * rowHeight;
        doc.text(text, rightX + 5, y + 5, { width: tableWidth - 10 });
        doc.moveTo(rightX, y).lineTo(rightX + tableWidth, y).stroke();
        doc.moveTo(rightX, y + rowHeight).lineTo(rightX + tableWidth, y + rowHeight).stroke();
        doc.moveTo(rightX, y).lineTo(rightX, y + rowHeight).stroke();
        doc.moveTo(rightX + tableWidth, y).lineTo(rightX + tableWidth, y + rowHeight).stroke();
      });

      doc.y = startY + leftData.length * rowHeight + 10;
    };

    drawHeader();
    drawJobInfoTables();

    // ✅ Legend
    doc.fontSize(10).text("Legend:", 30, doc.y);
    let legendY = doc.y;

    const drawSymbol = (type, x, y) => {
      doc.save();
      switch (type) {
        case "good":
          doc.circle(x, y, 6).stroke();
          break;
        case "nogood":
          doc.lineWidth(1);
          doc.moveTo(x - 6, y - 6).lineTo(x + 6, y + 6);
          doc.moveTo(x + 6, y - 6).lineTo(x - 6, y + 6);
          doc.stroke();
          break;
        case "corrected":
          doc.circle(x, y, 6).stroke();
          doc.moveTo(x - 4, y - 4).lineTo(x + 4, y + 4);
          doc.moveTo(x + 4, y - 4).lineTo(x - 4, y + 4);
          doc.stroke();
          break;
        case "na":
          doc.font("Helvetica").fontSize(10).text("N/A", x - 10, y - 5);
          break;
      }
      doc.restore();
    };
    drawSymbol("good", 30 + 60, legendY + 5);
    doc.text("Good", 30 + 75, legendY);
    drawSymbol("nogood", 30 + 130, legendY + 5);
    doc.text("No Good", 30 + 145, legendY);
    drawSymbol("corrected", 30 + 210, legendY + 5);
    doc.text("Corrected", 30 + 225, legendY);
    drawSymbol("na", 30 + 290, legendY + 5);
    doc.text("Not Applicable", 30 + 305, legendY);

    doc.moveDown(2);

    // ✅ Table setup
    const colWidths = [300, 100, 150];
    const colX = [30];
    for (let i = 0; i < colWidths.length; i++) {
      colX[i + 1] = colX[i] + colWidths[i];
    }
    const rowHeight = 25;

    const drawTableHeader = () => {
      let y = doc.y;
      doc.font("Helvetica-Bold").fontSize(10);
      const headers = ["DESCRIPTION/SYSTEM", "STATUS", "REMARKS"];
      headers.forEach((h, i) => {
        doc.text(h, colX[i] + 5, y + 7, { width: colWidths[i] - 10, align: "left" });
      });
      doc.moveTo(30, y).lineTo(colX[colX.length - 1], y).stroke();
      doc.moveTo(30, y + rowHeight).lineTo(colX[colX.length - 1], y + rowHeight).stroke();
      colX.forEach(x => doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke());
      doc.y = y + rowHeight;
    };

    const drawRow = (cells, highlight = false, statusType = null) => {
      let y = doc.y;
      if (highlight) {
        doc.rect(30, y, colX[colX.length - 1] - 30, rowHeight).fill("#f0f0f0").stroke();
        doc.fillColor("black");
      }
      doc.font("Helvetica").fontSize(10);
      doc.text(cells[0], colX[0] + 5, y + 7, { width: colWidths[0] - 10, align: "left" });
      doc.text(cells[2], colX[2] + 5, y + 7, { width: colWidths[2] - 10, align: "left" });
      doc.moveTo(30, y).lineTo(colX[colX.length - 1], y).stroke();
      doc.moveTo(30, y + rowHeight).lineTo(colX[colX.length - 1], y + rowHeight).stroke();
      colX.forEach(x => doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke());
      if (statusType) {
        drawSymbol(statusType, colX[1] + colWidths[1] / 2, y + rowHeight / 2);
      }
      doc.y = y + rowHeight;
    };

    drawTableHeader();

    const romanNumerals = [
      "I","II","III","IV","V","VI","VII","VIII","IX","X",
      "XI","XII","XIII","XIV","XV"
    ];

    const buildItemTree = (items) => {
      const itemMap = {};
      const roots = [];
      items.forEach(item => {
        itemMap[item._id] = { ...item, children: [] };
      });
      items.forEach(item => {
        if (item.parentItem) {
          if (itemMap[item.parentItem]) {
            itemMap[item.parentItem].children.push(itemMap[item._id]);
          }
        } else {
          roots.push(itemMap[item._id]);
        }
      });
      return roots;
    };

    const drawItems = (items, prefix = "", indent = 0) => {
      const filteredItems = items.filter((item) => !(item.type === "input" && !item.value));
      filteredItems.forEach((item, idx) => {
        if (doc.y > 700) {
          doc.addPage();
          drawHeader();
          drawTableHeader();
        }
        const num = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
        const cleanedName = item.name.replace(/™/g, '').trim();
        const subItemPrefix = indent > 0 ? "- " : "";
        const indentedDesc = '  '.repeat(indent) + subItemPrefix + `${num}. ${cleanedName}`;
        const statusType = item.status?.toLowerCase();
        const remarks = (item.status === "noGood" || item.status === "corrected") ? (item.remarks || "") : "";
        drawRow([indentedDesc, "", remarks], false, statusType);
        if (item.children && item.children.length > 0) {
          drawItems(item.children, num, indent + 1);
        }
      });
    };

    job.checklist.forEach((section, sIdx) => {
      const roman = romanNumerals[sIdx] || (sIdx + 1);
      drawRow([`${roman}. ${section.section}`, "", ""], true);
      const itemTree = buildItemTree(section.items);
      drawItems(itemTree);
    });

    // ✅ 1. Appearance Checklist
    doc.addPage();
    drawHeader();
    doc.fontSize(14).text("Appearance Checklist", { align: "center" });
    doc.moveDown();

    const imageWidth = 200;
    const imageHeight = 150;
    const gridX = [30, 250];
    const gridY = [doc.y, doc.y + imageHeight + 20];

    const sides = ['front', 'rear', 'left', 'right'];
    const positions = [
      { side: 'front', x: gridX[0], y: gridY[0] },
      { side: 'rear', x: gridX[1], y: gridY[0] },
      { side: 'left', x: gridX[0], y: gridY[1] },
      { side: 'right', x: gridX[1], y: gridY[1] }
    ];

    // ✅ Track temp files to clean up
    const tempFiles = [];

    for (const pos of positions) {
      const sideMarks = job.appearanceMarks?.filter(mark => mark.side === pos.side) || [];
      const imagePath = await getImagePath(job.appearanceImages?.[pos.side]);
      
      if (imagePath) {
        tempFiles.push(imagePath); // Track for cleanup
        doc.image(imagePath, pos.x, pos.y, { width: imageWidth, height: imageHeight });
      } else {
        doc.rect(pos.x, pos.y, imageWidth, imageHeight).stroke();
        doc.fontSize(10).text(`No ${pos.side} image`, pos.x + 10, pos.y + imageHeight / 2, { width: imageWidth - 20, align: "center" });
      }

      sideMarks.forEach((mark, idx) => {
        const markType = mark.type || 'circle';
        const clampedX = Math.max(0, Math.min(1, mark.x || 0));
        const clampedY = Math.max(0, Math.min(1, mark.y || 0));
        const clampedMarkX = pos.x + (clampedX * imageWidth);
        const clampedMarkY = pos.y + (clampedY * imageHeight);
        
        doc.save();
        doc.strokeColor('red').lineWidth(2);
        
        if (markType === 'circle') {
          const radius = mark.radius || 0.05;
          const scaledRadius = Math.max(5, radius * Math.min(imageWidth, imageHeight));
          doc.circle(clampedMarkX, clampedMarkY, scaledRadius).stroke();
        } else if (markType === 'path' && Array.isArray(mark.path) && mark.path.length > 1) {
          doc.beginPath();
          mark.path.forEach((point, index) => {
            const px = pos.x + ((point.x || 0) * imageWidth);
            const py = pos.y + ((point.y || 0) * imageHeight);
            if (index === 0) doc.moveTo(px, py);
            else doc.lineTo(px, py);
          });
          doc.stroke();
        }
        
        doc.restore();
        
        const textY = clampedMarkY - 20;
        const shortCode = mark.defectName?.split(' ')[0] || "Defect";
        doc.fontSize(8).fillColor('red').text(shortCode, clampedMarkX - 10, textY);
      });

      doc.fontSize(10).fillColor('black').text(pos.side.charAt(0).toUpperCase() + pos.side.slice(1), pos.x, pos.y - 15);
    }

    // Legend
    const legendX = gridX[1] + imageWidth + 20;
    doc.fontSize(12).text("Defect Legend:", legendX, gridY[0]);
    const defectOptions = [
      { code: 'C', label: 'Crack' },
      { code: 'SC', label: 'Scratch' },
      { code: 'D', label: 'Dent' }
    ];
    defectOptions.forEach((defect, idx) => {
      doc.fontSize(10).text(`${defect.code} - ${defect.label}`, legendX, gridY[0] + 20 + idx * 15);
    });

    doc.fontSize(12).text("Remarks:", legendX, gridY[0] + 20 + defectOptions.length * 15 + 20);
    let remarksY = gridY[0] + 40 + defectOptions.length * 15 + 20;
    sides.forEach(side => {
      const sideMarks = job.appearanceMarks?.filter(mark => mark.side === side) || [];
      if (sideMarks.length > 0) {
        doc.fontSize(10).text(`${side.charAt(0).toUpperCase() + side.slice(1)} Side:`, legendX, remarksY);
        remarksY += 15;
        sideMarks.forEach(mark => {
          if (mark.remarks) {
            doc.text(`- ${mark.defectName || "Defect"}: ${mark.remarks}`, legendX + 10, remarksY);
            remarksY += 12;
          }
        });
      }
    });

    // ✅ 2. Summary Checklist
    doc.addPage();
    drawHeader();
    doc.fontSize(14).text("Summary Checklist", { align: "center" });
    doc.moveDown();

    const drawDefectSymbol = (input, x, y) => {
      const defectCodeOptions = [
        { value: 'functional_safety', symbol: '■XX' },
        { value: 'functional_other', symbol: '■X' },
        { value: 'sensory_major', symbol: '□XX' },
        { value: 'sensory_minor', symbol: '□X' }
      ];
      let option = defectCodeOptions.find(opt => opt.value === input);
      if (!option) {
        option = defectCodeOptions.find(opt => opt.symbol.replace(/■|□/, '') === input);
      }
      if (!option) return;
      doc.save();
      if (option.symbol.includes('■')) {
        doc.rect(x, y - 6, 12, 12).fillAndStroke();
        doc.fillColor('black').fontSize(8).text(option.symbol.replace('■', ''), x + 15, y - 4);
      } else if (option.symbol.includes('□')) {
        doc.rect(x, y - 6, 12, 12).stroke();
        doc.fillColor('black').fontSize(8).text(option.symbol.replace('□', ''), x + 15, y - 4);
      }
      doc.restore();
    };

    const summaryLegendX = 30;
    const statusLegendX = 450;
    const summaryLegendY = doc.y;
    doc.fontSize(10).text("Defect Code Legend:", summaryLegendX, summaryLegendY);
    const defectCodeOptions = [
      { value: 'functional_safety', symbol: '■XX', label: 'FUNCTIONAL DEFECT/DEFECT RELATED TO SAFETY/DEFECT NOT SATISFYING THE DRAWING/DEFECT RELATED TO REGULATIONS' },
      { value: 'functional_other', symbol: '■X', label: 'FUNCTIONAL DEFECT DOES NOT MENTIONED ABOVE' },
      { value: 'sensory_major', symbol: '□XX', label: 'SENSORY/APPEARANCE DEFECT EVALUATION - MAJOR' },
      { value: 'sensory_minor', symbol: '□X', label: 'SENSORY/APPEARANCE DEFECT EVALUATION - MINOR' }
    ];
    defectCodeOptions.forEach((option, idx) => {
      drawDefectSymbol(option.value, summaryLegendX + 10, summaryLegendY + 15 + idx * 20 + 6);
      doc.fontSize(8).text(` - ${option.label}`, summaryLegendX + 50, summaryLegendY + 15 + idx * 20, { width: 350, align: 'left' });
    });

    doc.fontSize(10).text("Status Legend:", statusLegendX, summaryLegendY);
    const statusOptions = [
      { value: 'noGood', label: 'No Good' },
      { value: 'corrected', label: 'Corrected' }
    ];
    statusOptions.forEach((option, idx) => {
      drawSymbol(option.value, statusLegendX + 10, summaryLegendY + 15 + idx * 20 + 6);
      doc.fontSize(8).text(` - ${option.label}`, statusLegendX + 30, summaryLegendY + 15 + idx * 20);
    });

    const maxLegendHeight = 15 + (defectCodeOptions.length - 1) * 20 + 20;
    doc.y = summaryLegendY + maxLegendHeight + 10;

    const summaryColWidths = [50, 100, 150, 80, 80, 100];
    const summaryColX = [30];
    for (let i = 0; i < summaryColWidths.length; i++) {
      summaryColX[i + 1] = summaryColX[i] + summaryColWidths[i];
    }
    const summaryRowHeight = 50;

    let summaryY = doc.y;
    doc.font("Helvetica-Bold").fontSize(10);
    const summaryHeaders = ["No.", "Defect Code", "Defect Encountered", "Status", "Recurrence", "Image"];
    summaryHeaders.forEach((h, i) => {
      doc.text(h, summaryColX[i] + 5, summaryY + 7, { width: summaryColWidths[i] - 10, align: "center" });
    });
    doc.moveTo(30, summaryY).lineTo(summaryColX[summaryColX.length - 1], summaryY).stroke();
    doc.moveTo(30, summaryY + summaryRowHeight).lineTo(summaryColX[summaryColX.length - 1], summaryY + summaryRowHeight).stroke();
    summaryColX.forEach(x => doc.moveTo(x, summaryY).lineTo(x, summaryY + summaryRowHeight).stroke());
    doc.y = summaryY + summaryRowHeight;

    // ✅ Use for...of instead of forEach to support await
for (let idx = 0; idx < (job.defectSummary || []).length; idx++) {
  const defect = job.defectSummary[idx];

  if (doc.y > 700) {
    doc.addPage();
    drawHeader();
    summaryY = doc.y;
    summaryHeaders.forEach((h, i) => {
      doc.text(h, summaryColX[i] + 5, summaryY + 7, { width: summaryColWidths[i] - 10, align: "center" });
    });
    doc.moveTo(30, summaryY).lineTo(summaryColX[summaryColX.length - 1], summaryY).stroke();
    doc.moveTo(30, summaryY + summaryRowHeight).lineTo(summaryColX[summaryColX.length - 1], summaryY + summaryRowHeight).stroke();
    summaryColX.forEach(x => doc.moveTo(x, summaryY).lineTo(x, summaryY + summaryRowHeight).stroke());
    doc.y = summaryY + summaryRowHeight;
  }
  summaryY = doc.y;

  const cells = [
    defect.no || (idx + 1).toString(),
    "",
    defect.defectEncountered || "N/A",
    "",
    defect.recurrence?.toString() || "0",
    ""
  ];
  let dynamicRowHeight = summaryRowHeight;
  doc.font("Helvetica").fontSize(14);
  cells.forEach((cell, i) => {
    if (i !== 1 && i !== 3 && i !== 5) {
      const cellHeight = doc.heightOfString(cell, { width: summaryColWidths[i] - 10 }) + 10;
      dynamicRowHeight = Math.max(dynamicRowHeight, cellHeight);
    }
  });

  doc.font("Helvetica").fontSize(14);
  doc.text(cells[0], summaryColX[0] + 5, summaryY + 7, { width: summaryColWidths[0] - 10, align: "center" });
  if (defect.defectCode) {
    drawDefectSymbol(defect.defectCode, summaryColX[1] + 10, summaryY + dynamicRowHeight / 2);
  } else {
    doc.text("N/A", summaryColX[1] + 5, summaryY + 7, { width: summaryColWidths[1] - 10, align: "center" });
  }
  doc.text(cells[2], summaryColX[2] + 5, summaryY + 7, { width: summaryColWidths[2] - 10 });
  if (defect.status === 'noGood') {
    drawSymbol('nogood', summaryColX[3] + summaryColWidths[3] / 2, summaryY + dynamicRowHeight / 2);
  } else if (defect.status === 'corrected') {
    drawSymbol('corrected', summaryColX[3] + summaryColWidths[3] / 2, summaryY + dynamicRowHeight / 2);
  } else {
    doc.text("N/A", summaryColX[3] + 5, summaryY + 7, { width: summaryColWidths[3] - 10, align: "center" });
  }
  doc.text(cells[4], summaryColX[4] + 5, summaryY + 7, { width: summaryColWidths[4] - 10, align: "center" });

  // ✅ Download defect image to temp file
  const defectImagePath = await getImagePath(defect.image);
  if (defectImagePath) {
    tempFiles.push(defectImagePath); // Track for cleanup
    try {
      const imageX = summaryColX[5] + (summaryColWidths[5] - 40) / 2;
      const imageY = summaryY + (dynamicRowHeight - 40) / 2;
      doc.image(defectImagePath, imageX, imageY, { width: 40, height: 40 });
    } catch (imgErr) {
      console.error("Error loading defect image:", imgErr.message);
      doc.text("Image error", summaryColX[5] + 5, summaryY + 7, { width: summaryColWidths[5] - 10, align: "center" });
    }
  } else {
    doc.text("N/A", summaryColX[5] + 5, summaryY + 7, { width: summaryColWidths[5] - 10, align: "center" });
  }

  doc.moveTo(30, summaryY).lineTo(summaryColX[summaryColX.length - 1], summaryY).stroke();
  doc.moveTo(30, summaryY + dynamicRowHeight).lineTo(summaryColX[summaryColX.length - 1], summaryY + dynamicRowHeight).stroke();
  summaryColX.forEach(x => doc.moveTo(x, summaryY).lineTo(x, summaryY + dynamicRowHeight).stroke());
  doc.y = summaryY + dynamicRowHeight;
}

    // ✅ 3. Technical Checklist
    doc.addPage();
    drawHeader();
    doc.fontSize(14).text("Technical Checklist", { align: "center" });
    doc.moveDown();

    const calculateTextHeight = (text, width, fontSize = 10) => {
      doc.fontSize(fontSize);
      return doc.heightOfString(text, { width }) + 10;
    };

    const drawTable = (headers, rows, colWidths, startY, headerFontSize = 10) => {
      const colX = [30];
      for (let i = 0; i < colWidths.length; i++) {
        colX[i + 1] = colX[i] + colWidths[i];
      }
      let currentY = startY;
      const spannedColumns = new Set();

      headers.forEach(headerRow => {
        let headerHeight = 15;
        headerRow.forEach((h, i) => {
          const span = h.span || 1;
          const startCol = headerRow.slice(0, i).reduce((acc, prev) => acc + (prev.span || 1), 0);
          const endCol = startCol + span - 1;
          const spanWidth = colX[endCol + 1] - colX[startCol];
          const cellHeight = calculateTextHeight(h.text, spanWidth - 10, headerFontSize);
          headerHeight = Math.max(headerHeight, cellHeight);
        });

        let colIndex = 0;
        headerRow.forEach((h) => {
          const startCol = colIndex;
          const span = h.span || 1;
          const endCol = colIndex + span - 1;
          const spanWidth = colX[endCol + 1] - colX[startCol];
          doc.font("Helvetica-Bold").fontSize(headerFontSize);
          doc.text(h.text, colX[startCol] + 5, currentY + 5, { width: spanWidth - 10, align: "center" });
          doc.moveTo(colX[startCol], currentY).lineTo(colX[startCol] + spanWidth, currentY).stroke();
          doc.moveTo(colX[startCol], currentY + headerHeight).lineTo(colX[startCol] + spanWidth, currentY + headerHeight).stroke();
          doc.moveTo(colX[startCol], currentY).lineTo(colX[startCol], currentY + headerHeight).stroke();
          doc.moveTo(colX[startCol] + spanWidth, currentY).lineTo(colX[startCol] + spanWidth, currentY + headerHeight).stroke();
          for (let j = 1; j < span; j++) {
            spannedColumns.add(startCol + j);
          }
          colIndex += span;
        });

        colX.forEach((x, idx) => {
          if (!spannedColumns.has(idx)) {
            doc.moveTo(x, currentY).lineTo(x, currentY + headerHeight).stroke();
          }
        });

        currentY += headerHeight;
      });

      rows.forEach(row => {
        let rowHeight = 20;
        const cellHeights = row.map((cell, i) => calculateTextHeight(cell.text || "", colWidths[i] - 10));
        rowHeight = Math.max(rowHeight, ...cellHeights);

        if (currentY + rowHeight > 700) {
          doc.addPage();
          drawHeader();
          currentY = doc.y;
        }

        doc.font("Helvetica").fontSize(10);
        row.forEach((cell, i) => {
          const cellHeight = cellHeights[i];
          const textY = currentY + (rowHeight - cellHeight) / 2 + 5;
          doc.text(cell.text || "", colX[i] + 5, textY, { width: colWidths[i] - 10, align: cell.align || "left" });
        });

        doc.moveTo(30, currentY).lineTo(colX[colX.length - 1], currentY).stroke();
        doc.moveTo(30, currentY + rowHeight).lineTo(colX[colX.length - 1], currentY + rowHeight).stroke();
        colX.forEach((x, idx) => {
          if (!spannedColumns.has(idx)) {
            doc.moveTo(x, currentY).lineTo(x, currentY + rowHeight).stroke();
          }
        });
        currentY += rowHeight;
      });

      return currentY;
    };

    const techData = job.technicalTests || {};

    doc.fontSize(12).text("I. Break Testing (Breaking Force daN)", 30, doc.y);
    doc.moveDown();

    let tableY = doc.y;
    const maxHeaders = [[{ text: "Maximum Breaking Force", span: 4 }]];
    const maxRows = [
      [{ text: "Front (Left Hand)", align: "center" }, { text: "Front (Right Hand)", align: "center" }, { text: "Sum", align: "center" }, { text: "Front Difference", align: "center" }],
      [{ text: techData.breakingForce?.max?.front?.left || "", align: "center" }, { text: techData.breakingForce?.max?.front?.right || "", align: "center" }, { text: techData.breakingForce?.max?.front?.sum || "", align: "center" }, { text: techData.breakingForce?.max?.front?.difference || "", align: "center" }],
      [{ text: "Rear (Left Hand)", align: "center" }, { text: "Rear (Right Hand)", align: "center" }, { text: "Sum", align: "center" }, { text: "Rear Difference", align: "center" }],
      [{ text: techData.breakingForce?.max?.rear?.left || "", align: "center" }, { text: techData.breakingForce?.max?.rear?.right || "", align: "center" }, { text: techData.breakingForce?.max?.rear?.sum || "", align: "center" }, { text: techData.breakingForce?.max?.rear?.difference || "", align: "center" }]
    ];
    const maxColWidths = [100, 100, 100, 100];
    tableY = drawTable(maxHeaders, maxRows, maxColWidths, tableY);
    doc.y = tableY + 10;

    const minHeaders = [[{ text: "Minimum Breaking Force", span: 4 }]];
    const minRows = [
      [{ text: "Front (Left Hand)", align: "center" }, { text: "Front (Right Hand)", align: "center" }, { text: "Sum", align: "center" }, { text: "Front Difference", align: "center" }],
      [{ text: techData.breakingForce?.min?.front?.left || "", align: "center" }, { text: techData.breakingForce?.min?.front?.right || "", align: "center" }, { text: techData.breakingForce?.min?.front?.sum || "", align: "center" }, { text: techData.breakingForce?.min?.front?.difference || "", align: "center" }],
      [{ text: "Rear (Left Hand)", align: "center" }, { text: "Rear (Right Hand)", align: "center" }, { text: "Sum", align: "center" }, { text: "Rear Difference", align: "center" }],
      [{ text: techData.breakingForce?.min?.rear?.left || "", align: "center" }, { text: techData.breakingForce?.min?.rear?.right || "", align: "center" }, { text: techData.breakingForce?.min?.rear?.sum || "", align: "center" }, { text: techData.breakingForce?.min?.rear?.difference || "", align: "center" }]
    ];
    tableY = drawTable(minHeaders, minRows, maxColWidths, doc.y);
    doc.y = tableY + 10;

    doc.fontSize(12).text("II. Speed Testing", 30, doc.y);
    doc.moveDown();
    const speedHeaders = [[{ text: "Speedometer Reading" }, { text: "Speed Tester Reading" }]];
    const speedRows = [[{ text: techData.speedTesting?.speedometer || "", align: "center" }, { text: techData.speedTesting?.tester || "", align: "center" }]];
    const speedColWidths = [200, 200];
    tableY = drawTable(speedHeaders, speedRows, speedColWidths, doc.y);
    doc.y = tableY + 10;

    doc.fontSize(12).text("III. Turning Radius", 30, doc.y);
    doc.moveDown();
    const turningHeaders = [[{ text: "" }, { text: "Inner Tire" }, { text: "Outer Tire" }]];
    const turningRows = [
      [{ text: "Left Hand", align: "center" }, { text: techData.turningRadius?.inner?.left || "", align: "center" }, { text: techData.turningRadius?.outer?.left || "", align: "center" }],
      [{ text: "Right Hand", align: "center" }, { text: techData.turningRadius?.inner?.right || "", align: "center" }, { text: techData.turningRadius?.outer?.right || "", align: "center" }]
    ];
    const turningColWidths = [100, 150, 150];
    tableY = drawTable(turningHeaders, turningRows, turningColWidths, doc.y);
    doc.y = tableY + 10;

    doc.fontSize(12).text("IV. Slip Tester", 30, doc.y);
    doc.moveDown();
    const slipHeaders = [[{ text: "Speed" }, { text: "Value" }]];
    const slipRows = (techData.slipTester || []).map(slip => [{ text: slip.speed || "", align: "center" }, { text: slip.value || "", align: "center" }]);
    const slipColWidths = [200, 200];
    tableY = drawTable(slipHeaders, slipRows, slipColWidths, doc.y);
    doc.y = tableY + 10;

    doc.fontSize(12).text("V. Headlight Tester", 30, doc.y);
    doc.moveDown();
    const headlightHeaders = [[{ text: "" }, { text: "Low Beam", span: 2 }, { text: "High Beam", span: 2 }], [{ text: "" }, { text: "Before Adjustment" }, { text: "After Adjustment" }, { text: "Before Adjustment" }, { text: "After Adjustment" }]];
    const headlightRows = [
      [{ text: "Left Hand", align: "center" }, { text: techData.headlightTester?.lowBeam?.before?.left || "N/A", align: "center" }, { text: techData.headlightTester?.lowBeam?.after?.left || "N/A", align: "center" }, { text: techData.headlightTester?.highBeam?.before?.left || "N/A", align: "center" }, { text: techData.headlightTester?.highBeam?.after?.left || "N/A", align: "center" }],
      [{ text: "Right Hand", align: "center" }, { text: techData.headlightTester?.lowBeam?.before?.right || "N/A", align: "center" }, { text: techData.headlightTester?.lowBeam?.after?.right || "N/A", align: "center" }, { text: techData.headlightTester?.highBeam?.before?.right || "N/A", align: "center" }, { text: techData.headlightTester?.highBeam?.after?.right || "N/A", align: "center" }]
    ];
    const headlightColWidths = [80, 80, 80, 80, 80];
    tableY = drawTable(headlightHeaders, headlightRows, headlightColWidths, doc.y, 8);
    doc.y = tableY + 10;

    doc.fontSize(12).text("VI. ABS Testing (if equipped)", 30, doc.y);
    doc.moveDown();
    const absHeaders = [[{ text: "Option" }, { text: "Remarks" }]];
    const absRows = (techData.absTesting || []).map(abs => [{ text: abs.option || "N/A", align: "left" }, { text: abs.remarks || "N/A", align: "left" }]);
    const absColWidths = [200, 200];
    tableY = drawTable(absHeaders, absRows, absColWidths, doc.y);
    doc.y = tableY + 10;

    // ✅ Clean up temp files before ending
    tempFiles.forEach(filePath => cleanupTempFile(filePath));

    doc.end();
  } catch (error) {
    console.error("Error generating job report:", error);
    res.status(500).json({ message: error.message });
  }
};