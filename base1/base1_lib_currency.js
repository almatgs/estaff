function convert_amount( srcValue, srcCurrencyID, destCurrencyID )
{
	if ( srcValue == null )
		return null;

	if ( srcCurrencyID == destCurrencyID )
		return srcValue;

	if ( get_rate( srcCurrencyID ) == null || get_rate( destCurrencyID ) == null )
		return srcValue;

	newAmount = Int( ( srcValue * get_rate( destCurrencyID ) ) / get_rate( srcCurrencyID ) );

	if ( destCurrencyID == 'RUR' )
		newAmount = ( ( newAmount + 50 ) / 100 ) * 100;
	else
		newAmount = ( ( newAmount + 5 ) / 10 ) * 10;

	return newAmount;
}


function get_rate( currencyID )
{
	return GetForeignElem( currencies, currencyID ).rate;
}



