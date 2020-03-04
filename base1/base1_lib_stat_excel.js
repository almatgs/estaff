function ExportStatToExcelFile( dest, destFileUrl )
{
	excelBuilder = OpenNewDoc( '//base1/base1_excel_builder.xml' ).TopElem;
	excelBuilder.Init();
	ExportReportExcel( dest, excelBuilder );
	excelBuilder.SaveToFile( destFileUrl );
}


function ExportReportExcel( dest, excelBuilder )
{
	//excelBuilder.SetColumnsNum( dest.header_columns.ChildNum );
	columnWidths = new Array;

	sumFixedWidth = 0;

	for ( i = 0; i < dest.header_columns.ChildNum; i++ )
	{
		headerColumn = dest.header_columns[i];
		if ( ( obj = StrOptScan( headerColumn.width, '%szr' ) ) != undefined )
			width = Int( obj[0] );
		else if ( ( obj = StrOptScan( headerColumn.width, '%szrc' ) ) != undefined )
			width = Int( obj[0] );
		else if ( ( obj = StrOptScan( headerColumn.width, '%s%%' ) ) != undefined )
			continue;
		else
			width = 10;

		columnWidths[i] = width;
		sumFixedWidth += width;
	}

	restWidth = Max( 170 - sumFixedWidth, 50 );

	for ( i = 0; i < dest.header_columns.ChildNum; i++ )
	{
		headerColumn = dest.header_columns[i];
		if ( ( obj = StrOptScan( headerColumn.width, '%s%%' ) ) != undefined )
			width = ( restWidth * Int( obj[0] ) ) / 100;
		else
			continue;

		//DebugMsg( headerColumn.width + ' ' + width );
		columnWidths[i] = width;
	}

	excelBuilder.SetColumnWidths( columnWidths );

	if ( dest.spec.is_v2 )
		ExportV2Core( dest, excelBuilder );
	else
		ExportV1Core( dest, excelBuilder );
}


function ExportV1Core( dest, excelBuilder )
{
	ExportV1Header( dest, excelBuilder );

	if ( dest.total.columns.ChildNum == 0 )
	{
		array = XmlArrayHier( dest.items );
	}
	else
	{
		array = XmlArrayHier( dest.items );
			
		if ( dest.spec.show_total )
			array = ArrayUnion( array, [dest.total] );
			
		if ( dest.spec.show_total_average )
			array = ArrayUnion( array, [dest.total_average] );
	}

	for ( item in array )
		ExportV1Item( dest, excelBuilder, item );
}


function ExportV2Core( dest, excelBuilder )
{
	ExportV2Header( dest, excelBuilder );

	for ( item in lib_stat_v2.GetDispItems( dest ) )
		ExportV2Item( dest, excelBuilder, item );
}


function ExportV2Header( dest, excelBuilder )
{
	if ( dest.top_columns.ChildNum != 0 )
	{
		excelBuilder.AddRow();

		for ( topColumn in dest.top_columns )
		{
			cellData = excelBuilder.CreateCellData();
			cellData.value = topColumn.title;
			cellData.horizSpan = topColumn.span;
			cellData.bkColor = GetHeaderBkColor();
			cellData.border = true;
			cellData.horizAlign = 'center';
			cellData.wrapText = true;

			if ( topColumn.use_vertical_text )
				cellData.textRotation = 90;

			excelBuilder.AddCell( cellData );
		}
	}

	excelBuilder.AddRow();
	for ( headerColumn in dest.header_columns )
	{
		cellData = excelBuilder.CreateCellData();
		cellData.value = headerColumn.title;
		cellData.bkColor = GetHeaderBkColor();
		cellData.border = true;
		cellData.horizAlign = 'center';
		cellData.wrapText = true;

		if ( headerColumn.use_vertical_text )
			cellData.textRotation = 90;

		excelBuilder.AddCell( cellData );
	}
}


function ExportV1Header( dest, excelBuilder )
{
	if ( dest.top_columns.ChildNum != 0 )
	{
		excelBuilder.AddRow();

		for ( topColumn in dest.top_columns )
		{
			cellData = excelBuilder.CreateCellData();
			cellData.value = topColumn.title;
			cellData.horizSpan = topColumn.span;
			cellData.bkColor = GetHeaderBkColor();
			cellData.border = true;
			cellData.horizAlign = 'center';
			cellData.wrapText = true;
			excelBuilder.AddCell( cellData );
		}
	}

	excelBuilder.AddRow();
	for ( headerColumn in dest.header_columns )
	{
		cellData = excelBuilder.CreateCellData();
		cellData.value = headerColumn.title;
		cellData.bkColor = GetHeaderBkColor();
		cellData.border = true;
		cellData.horizAlign = 'center';
		cellData.wrapText = true;
		excelBuilder.AddCell( cellData );
	}
}


function ExportV2Item( dest, excelBuilder, item )
{
	isBold = lib_stat_v2.IsItemBold( dest, item );

	excelBuilder.AddRow();
	if ( item.isDelim == true )
	{
		cellData = excelBuilder.CreateCellData();
		cellData.horizSpan = dest.header_columns.ChildNum;
		cellData.isBold = isBold;
		cellData.border = true;
		excelBuilder.AddCell( cellData );
		return;
	}

	for ( i = 0; i < dest.header_columns.ChildNum; i++ )
	{
		headerColumn = dest.header_columns[i];
		fieldSpec = dest.spec.fields[i];
		field = item.fields[fieldSpec.id];

		indentStr = lib_stat_v2.GetItemCellIndentStr( dest, item, field, fieldSpec );
		value = lib_stat_v2.GetItemCellTitle( dest, item, field, fieldSpec, {excel:true} );

		cellData = excelBuilder.CreateCellData();
		cellData.value = ( ( indentStr != '' ) ? indentStr + value : value );
		cellData.isBold = isBold;
		cellData.horizAlign = headerColumn.align;

		if ( DataType( value ) == 'string' )// && ( StrContains( value, '\n' ) || StrContains( value, '\n' ) ) )
			cellData.wrapText = true;

		cellData.border = true;
		cellData.bkColor = lib_stat_v2.GetItemCellBkColor( dest, item, field, fieldSpec );
		excelBuilder.AddCell( cellData );
	}
}


function ExportV1Item( dest, excelBuilder, item )
{
	excelBuilder.AddRow();
	if ( item.ChildExists( 'is_delim' ) && item.is_delim )
	{
		cellData = excelBuilder.CreateCellData();
		cellData.horizSpan = dest.header_columns.ChildNum;
		cellData.border = true;
		excelBuilder.AddCell( cellData );
		return;
	}

	for ( i = 0; i < dest.header_columns.ChildNum; i++ )
	{
		headerColumn = dest.header_columns[i];
		column = item.columns[i];
		fieldSpec = dest.spec.fields[i];

		/*if ( fieldSpec.stat_only && item.group_level == null )
		{
			cellData = excelBuilder.CreateCellData();
			cellData.border = true;
			excelBuilder.AddCell( cellData );
			continue;
		}*/

		elem = undefined;
							
		if ( item.record_ref.HasValue )
		{
			record = item.record_ref.Object;

			if ( headerColumn.elem_ref.HasValue )
				elem = record.OptChild( headerColumn.elem_ref.Object.Name );
		}

		str = column.indent_str;
							
		if ( fieldSpec.title_expr.HasValue )
		{
			try
			{
				Value = column.value;
				str += eval( fieldSpec.title_expr );
			}
			catch ( e )
			{
				str += UnifySpaces( e );
			}
		}
		else if ( item.Name != 'total' && headerColumn.elem_ref.HasValue && headerColumn.elem_ref.Object.ForeignArrayExpr != '' )
		{
			if ( elem != undefined )
			{
				if ( headerColumn.elem_ref.Object.IsMultiple )
				{
					str += elem.MultiElem.ForeignDispName;
				}
				else
				{
					str += elem.ForeignDispName;
				}
			}
		}
		else if ( ( headerColumn.data_type == 'integer' || ( item.group_level != null && fieldSpec.stat_func != '' ) ) && ( DataType( column.value.Value ) == 'integer' || ( DataType( column.value.Value ) == 'real' ) || headerColumn.data_type == 'integer' ) )
		{
			if ( RValue( column.value ) == undefined )
				continue;

			if ( DataType( column.value.Value ) == 'integer' && ! fieldSpec.is_percent )
				str = column.value.Value;
			else
				str += StrIntZero( column.value, 0, ! StrEnds( fieldSpec.id, 'year' ) );

			if ( fieldSpec.is_percent && column.value != null && column.value != 0 )
				str += '%';
		}
		else if ( headerColumn.data_type == 'real' )
		{
			if ( RValue( column.value ) == undefined )
				return '';

			if ( column.value != Real( 0 ) )
				str += StrReal( column.value, ( fieldSpec.float_precision.HasValue ? fieldSpec.float_precision : 0 ), true );
			else
				str += '-';

			if ( fieldSpec.is_percent && column.value != null && column.value != 0 )
				str += '%';
		}
		else if ( headerColumn.data_type == 'bool' && ! ( item.group_level != null /*&& headerColumn.stat_func != ''*/ ) )
		{
			str += ( column.value ? '+' : '' );
		}
		else if ( headerColumn.data_type == 'date' && DataType( column.value.Value ) == 'date' )
		{
			str += StrDate( column.value, false );
		}
		else
		{
			str += column.value;
		}

		cellData = excelBuilder.CreateCellData();
		cellData.value = str;
		
		if ( item.Name == 'total' || item.bold || ( item.group_spec != undefined && item.group_spec.bold ) )
			cellData.isBold = true;
			
		cellData.horizAlign = headerColumn.align;
		
		if ( StrContains( str, ' ' ) || StrContains( str, '\n' ) )
			cellData.wrapText = true;

		if ( item.Name == 'total' )
		{
			cellData.bkColor = '240,240,240';
		}
		else
		{
			if ( item.group_level != null && item.group_spec.bk_color != '' )
				cellData.bkColor = item.group_spec.bk_color;
			else
				cellData.bkColor = item.columns[i].bk_color;
		}

		cellData.border = true;
		excelBuilder.AddCell( cellData );
	}
}


function GetHeaderBkColor()
{
	return '217,217,217';
}