function BuildReport( dest )
{
	if ( ! dest.filter.min_date.HasValue && ! dest.filter.max_date.HasValue )
	{
		dest.filter.min_date = Date( Year( CurDate ), Month( CurDate ), 1 );
		dest.filter.max_date = DateOffset( lib_base.get_month_date_offset( dest.filter.min_date, 1 ), 0 - 86400 );
	}

	queryStr = 'for $elem in candidates';
	qual = '';

	if ( dest.filter.min_date.HasValue )
		qual += ' and $elem/creation_date >= ' + dest.filter.min_date.XQueryLiteral;

	if ( dest.filter.max_date.HasValue )
		qual += ' and $elem/creation_date <= ' + XQueryLiteral( DateNewTime( dest.filter.max_date, 23, 59, 59 ) );

	if ( dest.filter.user_id.HasValue )
		qual += ' and $elem/user_id = ' + dest.filter.user_id.XQueryLiteral;

	if ( dest.filter.ChildExists( 'group_id' ) && dest.filter.group_id.HasValue )
		qual += ' and MatchSome( $elem/group_id, ' + dest.filter.group_id.XQueryLiteral + ' )';

	queryStr += StrReplaceOne( qual, ' and ', ' where ' );
	queryStr += ' return $elem';
	//DebugMsg( queryStr );
	candidatesArray = XQuery( queryStr );

	for ( candidate in candidatesArray )
	{
		groupItem = ObtainItemByKey( dest, dest, candidate.user_id.ForeignElem.main_group_id );
		item = ObtainItemByKey( dest, groupItem, candidate.user_id );

		column = item.columns[dest.idxCol.candidate_count];
		column.value++;

		if ( ! column.unique_keys_ref.HasValue )
			column.unique_keys_ref = new Array;

		column.unique_keys_ref.Object.push( RValue( candidate.id ) );
	}

	queryStr = 'for $elem in events';
	qual = '';

	if ( dest.filter.min_date.HasValue )
		qual += ' and $elem/date >= ' + dest.filter.min_date.XQueryLiteral;

	if ( dest.filter.max_date.HasValue )
		qual += ' and $elem/date <= ' + XQueryLiteral( DateNewTime( dest.filter.max_date, 23, 59, 59 ) );

	if ( dest.filter.user_id.HasValue )
		qual += ' and $elem/user_id = ' + dest.filter.user_id.XQueryLiteral;

	if ( dest.filter.ChildExists( 'group_id' ) && dest.filter.group_id.HasValue )
		qual += ' and MatchSome( $elem/group_id, ' + dest.filter.group_id.XQueryLiteral + ' )';

	queryStr += StrReplaceOne( qual, ' and ', ' where ' );
	queryStr += ' return $elem';
	//DebugMsg( queryStr );
	eventsArray = XQuery( queryStr );

	for ( event in eventsArray )
	{
		if ( event.occurrence_id == 'scheduled' || event.occurrence_id == 'cancelled' )
			continue;

		groupItem = ObtainItemByKey( dest, dest, event.user_id.ForeignElem.main_group_id );
		item = ObtainItemByKey( dest, groupItem, event.user_id );

		switch ( event.type_id )
		{
			case 'probation':
				fieldID = 'hire_count';
				break;

			case 'skype':
				fieldID = 'interview_count';
				break;

			default:
				fieldID = event.type_id + '_count';
		}

		if ( ( fieldIndex = dest.idxCol.GetOptProperty( fieldID ) ) != undefined )
		{
			column = item.columns[fieldIndex];
			column.value++;

			if ( ! column.unique_keys_ref.HasValue )
				column.unique_keys_ref = new Array;

			column.unique_keys_ref.Object.push( RValue( event.id ) );
		}

		fieldID = undefined;

		if ( event.occurrence_id == 'withdrawn' )
		{
			fieldID = 'self_reject_count';
		}
		else if ( event.occurrence_id == 'reserve' )
		{
			fieldID = 'reserve_count';
		}
		else if ( event.occurrence_id == 'failed' && ( event.type.has_occurrence( 'reserve' ) || event.type.has_occurrence( 'withdrawn' ) ) )
		{
			if ( StrContains( event.type_id, 'rr_' ) )
				fieldID = 'rr_reject_count';
			else
				fieldID = 'reject_count';
		}

		if ( fieldID != undefined )
		{
			fieldIndex = dest.idxCol.GetProperty( fieldID );

			column = item.columns[fieldIndex];
			column.value++;

			if ( ! column.unique_keys_ref.HasValue )
				column.unique_keys_ref = new Array;

			column.unique_keys_ref.Object.push( RValue( event.id ) );
		}

	}

	lib_stat.recalc_items( dest, dest );
	dest.items.Sort( 'columns[0].value', '+', 'columns[1].value', '+' );

	
	for ( groupItem in ArraySelectAll( dest.items ) )
	{
		groupTotalItem = dest.items.InsertChild( groupItem.ChildIndex + 1 );
		groupTotalItem.bold = true;
		InitItemValues( dest, groupTotalItem );
		//groupTotalItem.columns[0].value = UiText.titles.stat_total;

		delimItem = dest.items.InsertChild( groupItem.ChildIndex + 2 );
		delimItem.is_delim = true;

		CalcItemTotal( dest, groupTotalItem, groupItem.items );

		for ( item in groupItem.items )
		{
			CalcItemPercentColumns( dest, item );
			SetItemLinks( dest, item );
		}

		CalcItemPercentColumns( dest, groupTotalItem );
		SetItemLinks( dest, groupTotalItem );

		lib_stat.recalc_item( dest, groupTotalItem );

		for ( column in groupItem.columns )
			column.bk_color = '';
	}

	CalcItemTotal( dest, dest.total, ArraySelect( dest.items, '! is_delim && ! key_value.HasValue' ) );
	CalcItemPercentColumns( dest, dest.total );
}


function ObtainItemByKey( dest, parentItem, keyVal )
{
	item = parentItem.items.GetOptChildByKey( keyVal );
	if ( item != undefined )
		return item;

	item = parentItem.items.AddChild();
	item.key_value = keyVal;
	
	if ( parentItem === dest )
	{
		item.init_columns();
		//item.set_base_column_values();
		item.bold = true;
	}
	else
	{
		InitItemValues( dest, item );
		item.columns[0].indent = 2;
	}

	if ( keyVal != null )
		item.columns[dest.idxCol.name].value = keyVal.ForeignDispName;
	else
		item.columns[dest.idxCol.name].value = '---';

	return item;
}


function InitItemValues( dest, item )
{
	item.init_columns();
	item.set_base_column_values();

	for ( i = 0; i < dest.spec.fields.ChildNum; i++ )
	{
		field = dest.spec.fields[i];
		if ( ! StrEnds( field.id, '_count' ) )
			continue;

		item.columns[i].value = 0;
	}
}


function CalcItemPercentColumns( dest, item )
{
	//item.columns[dest.idxCol.total_interview_count].value = item.columns[dest.idxCol.proactive_count].value + item.columns[dest.idxCol.interview_count].value;

	if ( item.columns[dest.idxCol.interview_count].value != 0 )
		item.columns[dest.idxCol.rr_resume_review_percent].value = ( item.columns[dest.idxCol.rr_resume_review_count].value * 100 ) / item.columns[dest.idxCol.interview_count].value;

	if ( item.columns[dest.idxCol.rr_resume_review_count].value != 0 )
		item.columns[dest.idxCol.rr_interview_percent].value = ( item.columns[dest.idxCol.rr_interview_count].value * 100 ) / item.columns[dest.idxCol.rr_resume_review_count].value;

	if ( item.columns[dest.idxCol.rr_interview_count].value != 0 )
		item.columns[dest.idxCol.hire_percent].value = ( item.columns[dest.idxCol.hire_count].value * 100 ) / item.columns[dest.idxCol.rr_interview_count].value;
}


function CalcItemTotal( dest, item, subItems )
{
	for ( i = 0; i < dest.spec.fields.ChildNum; i++ )
	{
		field = dest.spec.fields[i];
		if ( ! StrEnds( field.id, '_count' ) )
			continue;

		item.columns[i].value = ArraySum( subItems, 'columns[i].value' );
	}
}


function SetItemLinks( dest, item, subItems )
{
	for ( i = 0; i < dest.spec.fields.ChildNum; i++ )
	{
		field = dest.spec.fields[i];
		if ( ! StrEnds( field.id, '_count' ) )
			continue;

		if ( item.columns[i].value != 0 )
			item.columns[i].is_link = true;
	}
}


function OpenLink( dest, item, column )
{
	if ( column.unique_keys_ref.HasValue )
		idArray = column.unique_keys_ref.Object;
	else
		idArray = ArrayExpand( dest.items[item.ChildIndex - 1].items, 'columns[column.ChildIndex].unique_keys_ref.HasValue ? columns[column.ChildIndex].unique_keys_ref.Object : []' );
	
	doc = FetchDoc( 'x-app://base1/base1_view_stat_details.xml' );
	
	if ( column.ChildIndex == dest.idxCol.candidate_count )
		doc.TopElem.object_type_id = 'candidate';
	else
		doc.TopElem.object_type_id = 'event';
	
	doc.TopElem.ids_array_ref = idArray;

	ActiveScreen.Navigate( doc.Url, 'FrameStatDetails', true );
}

