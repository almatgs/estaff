function build_card_print_form( objectData, webFormUrl )
{
	webForm = OpenDoc( webFormUrl ).TopElem;
	form = DefaultDb.GetObjectForm( webForm.object_type_id );

	destStream = new BufStream;

	destStream.WriteStr( '<SPXML-PRINT>\r\n' );
	destStream.WriteStr( '<FORMAT FONT-NAME="Arial" FONT-SIZE="9" SPACE-BEFORE="3" SPACE-AFTER="3">\r\n' );

	destStream.WriteStr( '<P FONT-SIZE="12" BOLD="1" SPACE-AFTER="6">' );
	destStream.WriteStr( HtmlEncode( webForm.title ) );
	destStream.WriteStr( '</P>\r\n' );

	destStream.WriteStr( '<TABLE TABLE-BORDER="double" CELL-BORDER="single">\r\n' );
	destStream.WriteStr( '<COLGROUP>\r\n' );
	destStream.WriteStr( '<COL WIDTH="25zr"/>\r\n' );
	destStream.WriteStr( '<COL WIDTH="100%"/>\r\n' );
	destStream.WriteStr( '</COLGROUP>\r\n' );

	build_card_print_form_fields( destStream, objectData, webForm.fields, false );

	destStream.WriteStr( '</TABLE>\r\n' );

	destStream.WriteStr( '</FORMAT>' );
	destStream.WriteStr( '</SPXML-PRINT>' );

	return destStream.DetachStr();
}


function build_card_print_form_fields( destStream, objectData, fields, isArray )
{
	var			field;
	var			elem;
	var			subElem;

	for ( field in fields )
	{
		formElem = undefined;

		if ( field.id.HasValue )
		{
			if ( ! objectData.FormElem.PathExists( field.id ) )
				throw 'Invalid path: ' + field.id;

			formElem = objectData.FormElem.EvalPath( field.id );
		}

		if ( formElem.IsMethod )
			elem = GetObjectProperty( objectData, field.id );
		else if ( formElem.IsMultiple )
			elem = GetObjectProperty( objectData, field.id );
		else
			elem = objectData.EvalPath( field.id );

		if ( field.title.HasValue )
			title = field.title;
		else if ( formElem != undefined )
			title = formElem.Title;
		else
			title = '';

		isArray = ( ArrayCount( formElem ) == 1 && formElem[0].IsMultiple && elem.ChildNum != 0 );

		destStream.WriteStr( '<TR>\r\n' );

		if ( isArray )
		{
			destStream.WriteStr( '<TD HSPAN="2" ALIGN="center">' );
			destStream.WriteStr( HtmlEncode( title ) );
			destStream.WriteStr( '</TD>' );
		}
		else
		{
			destStream.WriteStr( '<TD ALIGN="right">' );
			destStream.WriteStr( HtmlEncode( title ) );
			destStream.WriteStr( '</TD>' );

			if ( formElem != undefined && formElem.ForeignArrayExpr != '' )
				value = elem.ForeignDispName;
			else
				value = elem;

			destStream.WriteStr( '<TD BOLD="1">' );
			destStream.WriteStr( HtmlEncode( value ) );
			destStream.WriteStr( '</TD>' );
		}

		destStream.WriteStr( '</TR>\r\n' );

		if ( isArray )
		{
			for ( subElem in elem )
				build_card_print_form_fields( destStream, subElem, field.fields, true );
		}
	}
}



