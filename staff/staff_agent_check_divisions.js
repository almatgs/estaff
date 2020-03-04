function RunAgentCheckDivisions()
{
	LogEvent( '', 'Starting checking division statuses' );

	queryStr = 'for $elem in divisions';
	queryStr += ' where $elem/is_active = true() and $elem/end_date != null() and $elem/end_date <= ' + XQueryLiteral( CurDate );
	queryStr += ' return $elem/Fields( "id" )';

	array1 = ArrayExtract( XQuery( queryStr ), 'id' );

	queryStr = 'for $elem in divisions';
	queryStr += ' where $elem/is_active = false() and ( $elem/end_date = null() or $elem/end_date > ' + XQueryLiteral( CurDate ) + ' )';
	queryStr += ' return $elem/Fields( "id" )';

	array2 = ArrayExtract( XQuery( queryStr ), 'id' );

	for ( divisionID in ArrayUnion( array1, array2 ) )
	{
		divisionDoc = DefaultDb.OpenObjectDoc( 'division', divisionID );
		division = divisionDoc.TopElem;

		divisionDoc.WriteDocInfo = false;
		divisionDoc.RunActionOnBeforeSave = false;
		divisionDoc.RunActionOnSave = false;
		divisionDoc.Save();

		LogEvent( '', divisionDoc.Url + ' - made inactive' );
	}

	LogEvent( '', 'Finished checking division statuses' );
}

