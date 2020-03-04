function Init()
{
	tempDirUrl = ObtainTempFile();
	
	sheetDataStream = new BufStream;
	mergedCells = new Array;
	sharedStrings = new Array;

	fonts = new Array;
	fills = new Array;
	borders = new Array;
	styles = new Array;

	RegisterFont( '' );

	RegisterFill( '<patternFill patternType="none"/>' );
	RegisterFill( '<patternFill patternType="gray125"/>' );

	RegisterBorder( '<left/><right/><top/><bottom/><diagonal/>' );
	
	RegisterStyle( ' fillId="0"' );
	
	itemsArray = new Array;

	ObtainDirectory( this.tempDirUrl );
}


function SetColumnsNum( columnsNum )
{
	this.columnsNum = columnsNum;
}


function SetColumnWidths( columnWidths )
{
	this.columnWidths = columnWidths;
	this.columnsNum = this.columnWidths.length;
}


function SaveToFile( destUrl )
{
	if ( this.rowsNum != 0 )
		FinishCurRow();

	BuildAuxFiles();

	for ( itemUrl in ReadDirectory( this.tempDirUrl ) )
		itemsArray.push( UrlFileName( itemUrl ) );

	destFilePath = UrlToFilePath( destUrl );
	ZipCreate( destFilePath, itemsArray, {BaseDir:UrlToFilePath( this.tempDirUrl )} );

	//DeleteDirectory( tempDirUrl );
}


function CreateCellData()
{
	cellData = new Object;
	cellData.SetStrictMode( false );
	return cellData;
}


function AddRow()
{
	if ( this.rowsNum != 0 )
		FinishCurRow();

	sheetDataStream.WriteStr( '<row r="' );
	sheetDataStream.WriteStr( rowsNum + 1 );
	sheetDataStream.WriteStr( '" spans="1:' );
	sheetDataStream.WriteStr( columnsNum );
	sheetDataStream.WriteStr( '" x14ac:dyDescent="0.25">' );

	rowsNum++;
}


function FinishCurRow()
{
	/*for ( columnIndex = curColumnIndex; columnIndex < columnsNum; columnIndex++ )
	{
		sheetDataStream.WriteStr( '<c r="' );
		sheetDataStream.WriteStr( GetCellCoord( rowsNum - 1, columnIndex ) );
		sheetDataStream.WriteStr( '"></c>' );
	}*/

	sheetDataStream.WriteStr( '</row>' );
	curColumnIndex = 0;
}


function AddCell( cellData )
{
	if ( cellData.horizSpan == 0 )
		throw 'Invalid span: ' + cellData.horizSpan;

	if ( cellData.horizSpan != undefined && cellData.horizSpan != null && cellData.horizSpan > 1 )
		horizSpan = cellData.horizSpan;
	else
		horizSpan = 1;

	if ( curColumnIndex + horizSpan > columnsNum )
		throw 'Columns num exceeded';

	styleID = RegisterStyleAttr( cellData );

	if ( ( cellData.value != undefined && cellData.value != '' ) || styleID != undefined || horizSpan > 1 )
	{
		dataType = DataType( cellData.value );

		sheetDataStream.WriteStr( '<c r="' );
		sheetDataStream.WriteStr( GetCellCoord( rowsNum - 1, curColumnIndex ) );
		sheetDataStream.WriteStr( '"' );
		
		if ( styleID != undefined )
			sheetDataStream.WriteStr( ' s="' + ( styleID ) + '"' );

		if ( dataType != 'integer' )
			sheetDataStream.WriteStr( ' t="s"' );
		
		sheetDataStream.WriteStr( '>' );

		if ( cellData.value != undefined && cellData.value != '' )
		{
			sheetDataStream.WriteStr( '<v>' );

			if ( dataType == 'integer' )
				sheetDataStream.WriteStr( StrSignedInt( cellData.value ) );
			else
				sheetDataStream.WriteStr( RegisterSharedString( cellData.value ) );

			//sheetDataStream.WriteStr( EncodeCharset( cellData.value, 'utf-8' ) );
			sheetDataStream.WriteStr( '</v>' );
		}

		sheetDataStream.WriteStr( '</c>' );
	}


	if ( horizSpan > 1 )
	{
		mergedCells.push( GetCellCoord( rowsNum - 1, curColumnIndex ) + ':' + GetCellCoord( rowsNum - 1, curColumnIndex + cellData.horizSpan - 1 ) );
		for ( i = 1; i < cellData.horizSpan; i++ )
		{
			sheetDataStream.WriteStr( '<c r="' );
			sheetDataStream.WriteStr( GetCellCoord( rowsNum - 1, curColumnIndex + i ) );
			sheetDataStream.WriteStr( '"></c>' );
		}
	}

	curColumnIndex += horizSpan;
}


function BuildAuxFiles()
{
	destStream = new BufStream;
	destStream.PrepareWriteSpace( 1 * 1500 );
	ExportXmlFileHeader( destStream );
	destStream.WriteStr( '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' );
	//destStream.WriteStr( '<Default Extension="bin" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.printerSettings"/>' );
	destStream.WriteStr( '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' );
	//destStream.WriteStr( '<Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' );
	destStream.WriteStr( '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>' );
	PutUrlData( UrlAppendPath( tempDirUrl, '[Content_Types].xml' ), destStream.DetachStr() );

	subDir = UrlAppendPath( tempDirUrl, '_rels' )
	ObtainDirectory( subDir );

	destStream = new BufStream;
	destStream.PrepareWriteSpace( 1 * 1024 );
	ExportXmlFileHeader( destStream );
	destStream.WriteStr( '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' );
	PutUrlData( UrlAppendPath( subDir, '.rels' ), destStream.DetachStr() );

	subDir = UrlAppendPath( tempDirUrl, 'docProps' )
	ObtainDirectory( subDir );

	destStream = new BufStream;
	destStream.PrepareWriteSpace( 1 * 1024 );
	ExportXmlFileHeader( destStream );
	destStream.WriteStr( '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Excel</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>Sheet1</vt:lpstr></vt:vector></TitlesOfParts><Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>15.0300</AppVersion></Properties>' );
	PutUrlData( UrlAppendPath( subDir, 'app.xml' ), destStream.DetachStr() );

	destStream = new BufStream;
	destStream.PrepareWriteSpace( 1 * 1024 );
	ExportXmlFileHeader( destStream );
	destStream.WriteStr( '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator></dc:creator><cp:lastModifiedBy></cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">2006-09-16T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2018-01-12T16:38:17Z</dcterms:modified></cp:coreProperties>' );
	PutUrlData( UrlAppendPath( subDir, 'core.xml' ), destStream.DetachStr() );

	subDir = UrlAppendPath( tempDirUrl, 'xl' )
	ObtainDirectory( subDir );

	destStream = new BufStream;
	ExportSharedStringsFile( destStream );
	PutUrlData( UrlAppendPath( subDir, 'sharedStrings.xml' ), destStream.DetachStr() );

	destStream = new BufStream;
	ExportStylesFile( destStream );
	PutUrlData( UrlAppendPath( subDir, 'styles.xml' ), destStream.DetachStr() );

	destStream = new BufStream;
	ExportWorkbookFile( destStream );
	PutUrlData( UrlAppendPath( subDir, 'workbook.xml' ), destStream.DetachStr() );

	subDir2 = UrlAppendPath( subDir, '_rels' )
	ObtainDirectory( subDir2 );

	destStream = new BufStream;
	destStream.PrepareWriteSpace( 1 * 1024 );
	ExportXmlFileHeader( destStream );
	destStream.WriteStr( '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' );
	//destStream.WriteStr( '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>' );
	destStream.WriteStr( '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>' );
	PutUrlData( UrlAppendPath( subDir2, 'workbook.xml.rels' ), destStream.DetachStr() );

	//subDir2 = UrlAppendPath( subDir, 'printerSettings' )
	//ObtainDirectory( subDir2 );
	//PutUrlData( UrlAppendPath( subDir2, 'printerSettings1.bin' ), LoadUrlData( 'excel_core/xl/printerSettings/printerSettings1.bin' ) );

	//subDir2 = UrlAppendPath( subDir, 'theme' )
	//ObtainDirectory( subDir2 );
	//PutUrlData( UrlAppendPath( subDir2, 'theme1.xml' ), LoadUrlData( 'excel_core/xl/theme/theme1.xml' ) );

	subDir2 = UrlAppendPath( subDir, 'worksheets' )
	ObtainDirectory( subDir2 );

	destStream = new BufStream;
	ExportSheetFile( destStream );
	PutUrlData( UrlAppendPath( subDir2, 'sheet1.xml' ), destStream.DetachStr() );

	subDir3 = UrlAppendPath( subDir2, '_rels' )
	ObtainDirectory( subDir3 );

	destStream = new BufStream;
	ExportSheetRelsFile( destStream );
	PutUrlData( UrlAppendPath( subDir3, 'sheet1.xml.rels' ), destStream.DetachStr() );
}


function ExportWorkbookFile( destStream )
{
	destStream.PrepareWriteSpace( 1 * 1024 );
	ExportXmlFileHeader( destStream );
	destStream.WriteStr( '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x15" xmlns:x15="http://schemas.microsoft.com/office/spreadsheetml/2010/11/main"><fileVersion appName="xl" lastEdited="6" lowestEdited="4" rupBuild="14420"/><workbookPr filterPrivacy="1" defaultThemeVersion="124226"/><bookViews><workbookView xWindow="240" yWindow="105" windowWidth="14805" windowHeight="8010"/></bookViews><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="122211"/></workbook>' );
}


function ExportSharedStringsFile( destStream )
{
	ExportXmlFileHeader( destStream );
	destStream.WriteStr( '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' );
	destStream.WriteStr( sharedStrings.length );
	destStream.WriteStr( '" uniqueCount="' );
	destStream.WriteStr( sharedStrings.length );
	destStream.WriteStr( '">' );
	
	for ( sharedString in sharedStrings )
	{
		destStream.WriteStr( '<si><t' );
		if ( StrBegins( sharedString, ' ' ) )
			destStream.WriteStr( ' xml:space="preserve"' );
		destStream.WriteStr( '>' );

		if ( AppCharset == 'utf-8' )
			encString = AdjustUtf8( sharedString );
		else
			encString = EncodeCharset( sharedString, 'utf-8' );

		destStream.WriteStr( XmlEscape( encString ) );
		destStream.WriteStr( '</t></si>' );
	}

	destStream.WriteStr( '</sst>' );
}


function ExportSheetFile( destStream )
{
	ExportXmlFileHeader( destStream );
	destStream.WriteStr( '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac">' );

	destStream.WriteStr( '<dimension ref="A1:' + GetCellCoord( rowsNum - 1, columnsNum - 1 ) + '"/>' );

	destStream.WriteStr( '<sheetViews>' );
	destStream.WriteStr( '<sheetView tabSelected="1" workbookViewId="0">' );
	//destStream.WriteStr( '<selection activeCell="G3" sqref="G3"/>' );
	destStream.WriteStr( '</sheetView>' );
	destStream.WriteStr( '</sheetViews>' );

	destStream.WriteStr( '<sheetFormatPr defaultRowHeight="15" x14ac:dyDescent="0.25"/>' );
	
	destStream.WriteStr( '<cols>' );
	
	for ( columnIndex = 0; columnIndex < columnsNum; columnIndex++ )
	{
		destStream.WriteStr( '<col min="' + ( columnIndex + 1 ) + '" max="' + ( columnIndex + 1 ) + '" width="' + columnWidths[columnIndex] + '" customWidth="1"/>' );
	}
	
	destStream.WriteStr( '</cols>' );
	
	destStream.WriteStr( '<sheetData>' );
	destStream.WriteStr( this.sheetDataStream.DetachStr() );
	destStream.WriteStr( '</sheetData>' );
	
	if ( mergedCells.length != 0 )
	{
		destStream.WriteStr( '<mergeCells count="' );
		destStream.WriteStr( mergedCells.length );
		destStream.WriteStr( '">' );

		for ( mergedCell in mergedCells )
			destStream.WriteStr( '<mergeCell ref="' + mergedCell + '"/>' );
	
		destStream.WriteStr( '</mergeCells>' );
	}
	
	//destStream.WriteStr( '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>' );
	//destStream.WriteStr( '<pageSetup paperSize="9" orientation="portrait" horizontalDpi="0" verticalDpi="0" r:id="rId1"/>' );

	destStream.WriteStr( '</worksheet>' );
}


function ExportStylesFile( destStream )
{
	destStream.PrepareWriteSpace( 1 * 1024 );
	ExportXmlFileHeader( destStream );
	destStream.WriteStr( '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac">' );
	
	destStream.WriteStr( '<fonts count="' + fonts.length + '" x14ac:knownFonts="1">' );
	
	for ( fontData in fonts )
	{
		destStream.WriteStr( '<font>' );
		destStream.WriteStr( fontData );
		destStream.WriteStr( '<sz val="11"/>' );
		
		if ( ! StrContains( fontData, '<color ' ) )
			destStream.WriteStr( '<color theme="1"/>' );
		
		destStream.WriteStr( '<name val="Calibri"/>' );
		destStream.WriteStr( '<family val="2"/>' );
		destStream.WriteStr( '<scheme val="minor"/>' );
		destStream.WriteStr( '</font>' );
	}
	
	destStream.WriteStr( '</fonts>' );

	
	destStream.WriteStr( '<fills count="' + fills.length + '">' );

	for ( fillData in fills )
	{
		destStream.WriteStr( '<fill>' );
		destStream.WriteStr( fillData );
		destStream.WriteStr( '</fill>' );
	}

	destStream.WriteStr( '</fills>' );


	destStream.WriteStr( '<borders count="' + borders.length + '">' );

	for ( borderData in borders )
	{
		destStream.WriteStr( '<border>' );
		destStream.WriteStr( borderData );
		destStream.WriteStr( '</border>' );
	}

	destStream.WriteStr( '</borders>' );

	destStream.WriteStr( '<cellStyleXfs count="1">' );
	destStream.WriteStr( '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>' );
	destStream.WriteStr( '</cellStyleXfs>' );

	destStream.WriteStr( '<cellXfs count="' + styles.length + '">' );

	for ( styleData in styles )
		destStream.WriteStr( styleData );

	destStream.WriteStr( '</cellXfs>' );

	//destStream.WriteStr( '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' );
	//destStream.WriteStr( '<dxfs count="0"/>' );
	//destStream.WriteStr( '<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleMedium9"/>' );
	//destStream.WriteStr( '<extLst><ext uri="{EB79DEF2-80B8-43e5-95BD-54CBDDF9020C}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:slicerStyles defaultSlicerStyle="SlicerStyleLight1"/></ext><ext uri="{9260A510-F301-46a8-8635-F512D64BE5F5}" xmlns:x15="http://schemas.microsoft.com/office/spreadsheetml/2010/11/main"><x15:timelineStyles defaultTimelineStyle="TimeSlicerStyleLight1"/></ext></extLst>' );

	destStream.WriteStr( '</styleSheet>' );
}


function ExportSheetRelsFile( destStream )
{
	destStream.PrepareWriteSpace( 1 * 1024 );
	ExportXmlFileHeader( destStream );
	destStream.WriteStr( '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' );
	//destStream.WriteStr( '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/printerSettings" Target="../printerSettings/printerSettings1.bin"/>' );
	destStream.WriteStr( '</Relationships>' );
}


function ExportXmlFileHeader( destStream )
{
	destStream.WriteStr( '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' );
}


function RegisterSharedString( str )
{
	stringID = sharedStrings.length;
	sharedStrings.push( '' + str );
	return stringID;
}


function RegisterStyleAttr( cellData )
{
	fontData = '';
	fillData = '';
	borderData = '';
	
	if ( cellData.isBold )
		fontData += '<b/>';

	if ( cellData.textColor != undefined && cellData.textColor != '' )
		fontData += '<color rgb="FF' + StrHexColor( cellData.textColor ) + '"/>';

	if ( cellData.bkColor != undefined && cellData.bkColor != '' )
		fillData = '<patternFill patternType="solid"><fgColor rgb="FF' + StrHexColor( cellData.bkColor ) + '"/></patternFill>';

	if ( cellData.border )
		borderData = '<left style="thin"></left><right style="thin"></right><top style="thin"></top><bottom style="thin"></bottom>';

	styleCoreData = '';
	styleSubData = '';

	if ( fontData != '' )
	{
		fontID = RegisterFont( fontData );
		styleCoreData += ' fontId="' + fontID + '" applyFont="1"';
	}

	if ( fillData != '' )
	{
		fillID = RegisterFill( fillData );
		styleCoreData += ' fillId="' + fillID + '" applyFill="1"';
	}

	if ( borderData != '' )
	{
		borderID = RegisterBorder( borderData );
		styleCoreData += ' borderId="' + borderID + '" applyBorder="1"';
	}

	if ( ( cellData.horizAlign != undefined && cellData.horizAlign != '' && cellData.horizAlign != 'left' ) || cellData.wrapText || cellData.textRotation != undefined )
	{
		styleCoreData += ' applyAlignment="1"';
		styleSubData += '<alignment';

		if ( cellData.horizAlign != undefined && cellData.horizAlign != '' && cellData.horizAlign != 'left' )
			styleSubData += ' horizontal="' + cellData.horizAlign + '"';

		if ( cellData.wrapText )
		{
			styleSubData += ' vertical="center"';
			styleSubData += ' wrapText="1"';
		}

		if ( cellData.textRotation != undefined )
			styleSubData += ' textRotation="' + cellData.textRotation + '"';

		styleSubData += '/>';
	}

	if ( styleCoreData != '' )
		return RegisterStyle( styleCoreData, styleSubData );

	return undefined;
}


function RegisterFont( fontData )
{
	return fonts.ObtainByValue( fontData );
}


function RegisterFill( fillData )
{
	return fills.ObtainByValue( fillData );
}


function RegisterBorder( borderData )
{
	return borders.ObtainByValue( borderData );
}


function RegisterStyle( styleCoreData, styleSubData )
{
	styleData = '<xf numFmtId="0"' + styleCoreData + ' xfId="0"'
	
	if ( styleSubData != undefined && styleSubData != '' )
		styleData += '>' + styleSubData + '</xf>';
	else
		styleData += '/>';

	return styles.ObtainByValue( styleData );
}


function GetCellCoord( rowIndex, columnIndex )
{
	return GetColumnCode( columnIndex ) + ( rowIndex + 1 );
}


function GetColumnCode( columnIndex )
{
	if ( columnIndex > 675 )
		throw 'Excel column index is too large: ' + columnIndex;

	if ( columnIndex <= 25 )
		return StrFromCharCode( 65 + columnIndex );

	return StrFromCharCode( 64 + columnIndex / 26 ) + StrFromCharCode( 65 + columnIndex % 26 );
}


function GetStrIndextSpacesNum( str )
{
	for ( count = 0; ; count++ )
	{
		if ( StrRangePos( str, count, count + 1 ) != ' ' )
			break;
	}

	return count;
}